# Alignment Viewer 2.0

Alignment Viewer 2.0 is a standalone [multiple sequence alignment](https://en.wikipedia.org/wiki/Multiple_sequence_alignment) (MSA) viewer written in TypeScript with the React framework. The project is primarily aimed at performance with the goal of enabling visualization and analysis of very
large alignemnts (up to hundreds of millions of residues).

A main website / demo is available at: https://fast.alignmentviewer.org/

The Alignment Viewer 2.0 component features:

- Display alignment details (i.e., down to individual residues) and/or the alignment in its entirety.
- Support for DNA/RNA and protein sequences
- Calculates and displays [sequence logos](https://en.wikipedia.org/wiki/Sequence_logo), consensus sequence, conservation / gap statistics.
- Support for sorting the alignment
- Support for different styling options including color schemes and selection of which residues to color (e.g., only those that match the consensus sequences).
- Client side only - runs in the browser alone.
- View can be customized, removing or adding only the pieces needed.
- Support for interaction events (clicking on, mousing over the alignments, logos, etc)

## Linking to Alignment Viewer 2.0

In addition to embedding Alignment Viewer 2.0 directly on your own website (see below), it is also possible to pass alignments to the demo website.

Links should take the form:

`https://fast.alignmentviewer.org?alignment-url={CUSTOM_ALIGNMENT_URL}`

1. The server hosting the custom alignment must be using HTTPS
2. The `CUSTOM_ALIGNMENT_URL` must be propertly encoded ([wikipedia description](https://en.wikipedia.org/wiki/Query_string#URL_encoding))
3. The alignment must be either in `fasta` or `stockholm` format.

Example links:

[https://fast.alignmentviewer.org?alignment-url=https%3A%2F%2Fwww.ebi.ac.uk%2Finterpro%2Fwwwapi%2F%2Fentry%2Fpfam%2FPF00571%2F%3Fannotation%3Dalignment%3Aseed](https://fast.alignmentviewer.org?alignment-url=https%3A%2F%2Fwww.ebi.ac.uk%2Finterpro%2Fwwwapi%2F%2Fentry%2Fpfam%2FPF00571%2F%3Fannotation%3Dalignment%3Aseed)

[https://fast.alignmentviewer.org?alignment-url=https%3A%2F%2Ffast.alignmentviewer.org%2F7fa1c5691376beab198788a726917d48_b0.4.a2m](https://fast.alignmentviewer.org?alignment-url=https%3A%2F%2Ffast.alignmentviewer.org%2F7fa1c5691376beab198788a726917d48_b0.4.a2m)


## Embedding Alignment Viewer 2.0

We're on [NPM](https://www.npmjs.com/) ([repository link](https://https://www.npmjs.com/package/alignment-viewer-2/)) so you can install using your favorite package manager, e.g.,:

```sh
yarn add alignment-viewer-2
```

Once installed, adding to your website is as simple as:

```JSX
import * as React from 'react';
import { 
  AlignmentViewer, 
  FastaAlignment
} from "alignment-viewer-2";

const fastaFileText = ">target\n" +
                      "ATGCATGC\n" +
                      ">seq1\n" +
                      "AAAACCCC\n" +
                      ">seq2\n" +
                      "ATGCATTT\n" +
                      ">seq3\n" +
                      "ATGCAAAA\n"
const alignmentObj = FastaAlignment.fromFileContents(
    "ALIGNMENT_NAME", fastaFileText
);

<AlignmentViewer alignment={ alignmentObj }/>
```

## Download code and gather dependencies

```sh
git clone https://github.com/sanderlab/AlignmentViewer2.0.git
cd AlignmentViewer2.0
yarn
```

## Run the Alignment Viewer 2.0 demo site locally
```sh
yarn start
```

## Build and run Alignment Viewer 2.0 locally
```sh
yarn build
cd build
python3 -m http.server
```


## Running Unit Tests - **BROKEN**
```sh
yarn test
```

## Performance Strategy

The Alignment Viewer 2.0 component was designed from the ground up to be highly performant in order to allow for viewing and analysis of very large MSAs - we actively test on an alignment based on [beta-lactamase](https://en.wikipedia.org/wiki/Beta-lactamase) that contains ~23,000
sequences of length ~250 amino acids ([link to beta-lactamase MSA](https://raw.githubusercontent.com/sanderlab/AlignmentViewer2.0/master/public/7fa1c5691376beab198788a726917d48_b0.4.a2m)).

Our strategy for dealing with peformance issues boils down to two main approaches:

1. **Don't load what isn't visible**: Inserting many elements into the HTML DOM at one time absolutely kills performance. Even insertion of a small alignment of e.g., 1000 sequences of length 300, would contain ~300,000 elements (amino acids), which is likely to have performance issues even on new machines. In order to allow for larger alignments, we only insert the portion of the MSA that is visible at any given time. We have done this by implementing a virtualized matrix together with virtual scrollbars and mouse listeners to allow users to browse the data. Any changes during browsing load only those elements that are visible. We also use the virtualization matrix for the spreadsheet code. As the virtualization also allows for syncing scroll offset, it is also reused for all of the barplots, logo, and positional axis, although these widgets are not actually virtualized for performance reasons (they are only shifted by the offset).

2. **Use the graphics card ([WebGL](https://get.webgl.org/) with [PixiJS](https://www.pixijs.com/))**: In order to get a zoomed-out view of a large fraction of the MSA in the same viewed windoow, we have also implemented the _MiniMap MSA Viewer_ using the [PixiJS](https://www.pixijs.com/) 2D WebGL framework. This viewer avoids having many DOM elements by representing the MSA as a series of tiled images (avoiding browser image size limits).

## Other Web-based Multiple Sequence Alignment Viewers

- Alignment Viewer<sup>1</sup> ([webpage](https://alignmentviewer.org/), [github](https://github.com/sanderlab/alignmentviewer)): The predecessor to Alignment Viewer 2.0, this project and website provide a means to view MSAs as perform additional sequence analysis like viewing sequence space with a UMAP component. Alignment Viewer was written in javascript.
- MSAViewer<sup>2</sup> ([webpage](http://msa.biojs.net), [github](https://github.com/wilzbach/msa)): A popular MSA viewer that provides a bunch of functionality such as sorting, filtering, changing color schemes, etc. MSAViewer can also be easily imported and embedded into other projects. Alignment Viewer was written in javascript.
- Jalview<sup>3</sup> ([webpage](https://www.jalview.org/)): an MSA viewer that provides primary, secondary, and tertiary visualizations and analyses that include sequence alignment, conservation and clustering, secondary structure and disorder prediction, etc.
- MView <sup>4</sup> ([webpage](https://www.ebi.ac.uk/Tools/msa/mview/)): Although not built specifically for the web, the MView command line utility can be executed from an EBI tool service. This tool can be used to reformats multiple sequence alignments files into html markup.
- Wasabi<sup>5</sup> ([webpage](http://wasabiapp.org/), [github](https://github.com/veidenberg/wasabi)): In addition to providing an MSA viewer, the Wasabi project provides a bunch of tools for evolutionary sequence analysis. Wasabi was written in python and javascript.
- AliView<sup>6</sup> ([webpage](https://ormbunkar.se/aliview/), [github](https://github.com/AliView/AliView)): Although aliview isn't web-based, it is one of the fastest and most useful MSA viewers so I thought it important to include.

## Color Schemes

Alignment Viewer 2.0 provides a bunch of different color schemes for both amino acid and nucleotide sequences. Scheme definitions were taken from the [msa-colorschemes](https://github.com/wilzbach/msa-colorschemes) repository, a part of the
[MSAViewer project](https://github.com/wilzbach/msa)<sup>2</sup>, which derived many of the schemes from [JalView](https://www.jalview.org/help/html/colourSchemes/)<sup>3</sup>.

## About Us

Alignment Viewer 2.0 was developed at the Dana-Farber Cancer Institute and Harvard Medical School by Yang Su, Andrew Diamantoukos, Chris Sander, and Nicholas Gauthier.

## Contributing

Alignment Viewer 2.0 is meant to be a community open source project. We actively encourage and support contributions. Alignment Viewer 2.0 is licensed under the MIT license.

Please fork and improve/enhance Alignment Viewer 2.0 any way you want. If you believe that your work will be of benifit to the entire community, please open a pull request.

## Citations

(1) Reguant R, Antipin Y, Sheridan R et al. AlignmentViewer: Sequence Analysis of Large Protein Families [version 1; peer review: 1 approved, 1 approved with reservations]. F1000Research 2020, 9:213

(2) Guy Yachdav and Sebastian Wilzbach and Benedikt Rauscher and Robert Sheridan and Ian Sillitoe and James Procter and Suzanna Lewis and Burkhard Rost and Tatyana Goldberg. "MSAViewer: interactive JavaScript visualization of multiple sequence alignments." Bioinformatics (2016)

(3) Waterhouse, A.M., Procter, J.B., Martin, D.M.A, Clamp, M. and Barton, G. J. (2009)
"Jalview Version 2 - a multiple sequence alignment editor and analysis workbench"
Bioinformatics25 (9) 1189-1191 doi: 10.1093/bioinformatics/btp033

(4) Brown, N.P., Leroy C., Sander C. (1998). MView: A Web compatible database search or multiple alignment viewer. Bioinformatics. 14 (4):380-381.

(5) Veidenberg, A., Medlar, A. and Löytynoja, A. (2015) Wasabi: an integrated platform for evolutionary sequence analysis and data visualisation. Mol. Biol. Evol.

(6) Larsson, A. (2014). AliView: a fast and lightweight alignment viewer and editor for large data sets. Bioinformatics30(22): 3276-3278. http://dx.doi.org/10.1093/bioinformatics/btu531
