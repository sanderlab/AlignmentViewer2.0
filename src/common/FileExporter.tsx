import { AminoAcidAlignmentStyle, NucleotideAlignmentStyle } from "./MolecularStyles";

/**
 * Pull the logo dom element off the page, clean up the dom a bit, add styling
 * and intiate a download.
 * @param style 
 */
export function downloadLogoSvg(style: AminoAcidAlignmentStyle | NucleotideAlignmentStyle){
    const svgLogoElements = document.getElementsByClassName("av2-sequence-logo");
    if (svgLogoElements.length < 1){
      console.error(
        "ERROR: no logo on page (no elements with 'av2-sequence-logo' found on the page)"
      );
    }
    else{
      const svgElement = svgLogoElements[0].cloneNode(true) as SVGElement;

      //1. remove the interaction placeholder rectangles
      const placeholders = svgElement.getElementsByClassName("interaction-placeholder");
      for (var i = placeholders.length - 1; i >= 0; --i) {
        placeholders[i].remove();
      }
      
      //2. add the classes to the decorate with the current color
      const newStyleDom = document.createElement('style')
      newStyleDom.setAttribute("type", "text/css");
      newStyleDom.textContent = Object.entries(
        style.selectedColorScheme.colors
      ).map(([resiCode, color])=>{
        return `.resi_${resiCode}{ 
          color: ${color}; 
          fill: ${color};
        }`;
      }).join('\n');
      svgElement.insertBefore(
        newStyleDom, svgElement.firstChild!
      );

      //(3) setup and request download
      var url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
        svgElement.outerHTML.replaceAll(
          "resi_", "r" //illustrator can't handle underscores in class names
        )
      );
      var link = document.createElement("a");
      link.download = "test.svg";
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('style', style.selectedColorScheme)
      console.log('1 :: svgElement:', svgElement.outerHTML.replaceAll("resi_", "r"));
    }
  };

