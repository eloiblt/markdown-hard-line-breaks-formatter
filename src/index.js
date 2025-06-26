async function formatWithRemark(markdown) {
  const [
    { default: remarkStringify },
    { default: remarkParse },
    { unified },
  ] = await Promise.all([
    import("remark-stringify"),
    import("remark-parse"),
    import("unified"),
  ]);

  const processor = unified()
    .use(remarkParse)
    .use(remarkStringify, {
      emphasis: "*",
      strong: "*",
      bullet: "-",
      handlers: {
        text: (node, parent, context, safeOptions) => {
          // Garde les underscores mais échappe les autres caractères spéciaux si nécessaire
          let result = node.value;

          // Échappe sélectivement selon le contexte
          const parentType = parent?.type;
          const isInLink = parentType === 'link' || parentType === 'linkReference';

          if (!isInLink) {
            result = result.replace(/\[/g, '\\[').replace(/\]/g, '\\]'); // Crochets seulement hors liens
          }

          // Échappe les astérisques seulement s'ils pourraient être interprétés comme emphasis/strong
          result = result.replace(/(\*+)/g, (match) => {
            // Échappe seulement si c'est 1 ou 2 astérisques consécutifs (emphasis/strong)
            return match.length <= 2 ? '\\' + match : match;
          });

          // Échappe les backticks seulement s'ils ne sont pas déjà dans du code
          result = result.replace(/`/g, '\\`');

          return result;
        }
      }
    });

  return String(await processor.process(markdown));
}

async function test() {
  try {
    const fs = await import("fs/promises");
    const markdown = await fs.readFile("./src/test.md", "utf8");

    const res = await formatWithRemark(markdown);
    console.log(res);
  } catch (error) {
    console.error("Test failed:", error);
  }
}

test();
