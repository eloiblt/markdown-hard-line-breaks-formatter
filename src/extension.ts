import * as vscode from "vscode";

const { unified } = require("unified");
const remarkParse = require("remark-parse").default;
const remarkStringify = require("remark-stringify").default;
const remarkDirective = require("remark-directive").default;
const remarkFrontmatter = require("remark-frontmatter").default;
const remarkGfm = require("remark-gfm").default;
const remarkMath = require("remark-math").default;
const stringWidth = require("string-width").default;

function replaceSoftBreaks(markdown: string): string {
  try {
    const lines = markdown.split("\n");
    const result = [];

    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      const nextLine = lines[i + 1];

      // Si on est à la dernière ligne, pas de transformation
      if (!nextLine) {
        result.push(currentLine);
        continue;
      }

      // Ignorer les hard breaks qui existent déjà
      if (currentLine.endsWith("  ")) {
        result.push(currentLine);
        continue;
      }

      // Ignorer les lignes vides
      if (currentLine.trim() === "" || nextLine.trim() === "") {
        result.push(currentLine);
        continue;
      }

      // Ignorer les titres (# ## ### etc.)
      if (currentLine.match(/^\s*#{1,6}\s/) || nextLine.match(/^\s*#{1,6}\s/)) {
        result.push(currentLine);
        continue;
      }

      // Ignorer les listes (- * + ou numérotées)
      if (
        currentLine.match(/^\s*[-*+]\s/) ||
        currentLine.match(/^\s*\d+\.\s/) ||
        nextLine.match(/^\s*[-*+]\s/) ||
        nextLine.match(/^\s*\d+\.\s/)
      ) {
        result.push(currentLine);
        continue;
      }

      // Ignorer les blocs de code (```)
      if (currentLine.match(/^\s*```/) || nextLine.match(/^\s*```/)) {
        result.push(currentLine);
        continue;
      }

      // Ignorer les citations (>)
      if (currentLine.match(/^\s*>/) || nextLine.match(/^\s*>/)) {
        result.push(currentLine);
        continue;
      }

      // Ignorer les tableaux (lignes contenant |)
      if (currentLine.includes("|") || nextLine.includes("|")) {
        result.push(currentLine);
        continue;
      }

      // Ignorer les lignes de séparation (---)
      if (
        currentLine.match(/^\s*-{3,}\s*$/) ||
        nextLine.match(/^\s*-{3,}\s*$/)
      ) {
        result.push(currentLine);
        continue;
      }

      // Si la ligne actuelle a du contenu (pas vide après trim)
      // et que la ligne suivante existe et n'est pas vide
      // alors on ajoute un hard break
      if (currentLine.trim() !== "") {
        result.push(currentLine + "  ");
      } else {
        result.push(currentLine);
      }
    }

    return result.join("\n");
  } catch (error) {
    console.log("replaceSoftBreaks: replacement failed", error);
    throw error;
  }
}

function removeUnderscores(
  node: any,
  parent: any,
  context: any,
  safeOptions: any
) {
  // Garde les underscores mais échappe les autres caractères spéciaux si nécessaire
  let result = node.value;

  // Échappe sélectivement selon le contexte
  const parentType = parent?.type;
  const isInLink = parentType === "link" || parentType === "linkReference";

  if (!isInLink) {
    result = result.replace(/\[/g, "\\[").replace(/\]/g, "\\]"); // Crochets seulement hors liens
  }

  // Échappe les astérisques seulement s'ils pourraient être interprétés comme emphasis/strong
  result = result.replace(/(\*+)/g, (match: any) => {
    // Échappe seulement si c'est 1 ou 2 astérisques consécutifs (emphasis/strong)
    return match.length <= 2 ? "\\" + match : match;
  });

  // Échappe les backticks seulement s'ils ne sont pas déjà dans du code
  result = result.replace(/`/g, "\\`");

  return result;
}

async function formatWithRemark(markdown: string): Promise<string> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkDirective)
    .use(remarkFrontmatter)
    .use(remarkGfm, { stringLength: stringWidth })
    .use(remarkMath)
    .use(remarkStringify, {
      emphasis: "*",
      strong: "*",
      bullet: "-",
      fences: true,
      handlers: {
        break: () => "  \n",
        text: (node: any, parent: any, context: any, safeOptions: any) =>
          removeUnderscores(node, parent, context, safeOptions),
        // Empêche la transformation des URLs en <url>
        link: (node: any, parent: any, context: any, safeOptions: any) => {
          // Récupère le texte visible du lien
          const linkText = node.children
            .map((child: any) => child.value || "")
            .join("");

          // Si le texte visible === URL, c'est un lien automatique
          if (linkText === node.url) {
            return node.url;
          }

          // Sinon, format normal [text](url)
          return `[${linkText}](${node.url})`;
        },
      },
    });

  return String(await processor.process(markdown));
}

export function activate(context: vscode.ExtensionContext) {
  console.log("Markdown formatter extension activated");

  const formattingProvider: vscode.DocumentFormattingEditProvider = {
    async provideDocumentFormattingEdits(
      document: vscode.TextDocument
    ): Promise<vscode.TextEdit[]> {
      console.log("Formatting requested for document:", document.fileName);

      const fullText = document.getText();

      const formatted = await formatWithRemark(fullText);
      const withHardBreaks = replaceSoftBreaks(formatted);

      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(fullText.length)
      );

      return [vscode.TextEdit.replace(fullRange, withHardBreaks)];
    },
  };

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      { language: "markdown" },
      formattingProvider
    )
  );
}

export function deactivate() {}
