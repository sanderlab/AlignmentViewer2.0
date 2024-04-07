export enum DEFAULT_ANNOTATION_FIELDS {
  ID = "@@id",
  ACTUAL_ID = "@@actualId",
  DESCRIPTION = "@@description",
  BEGIN = "@@begin",
  END = "@@end",
  LINK = "@@link",
  REAL_LENGTH = "@@realLength",
  ALIGNED_LENGTH = "@@alignedLength",
  LEFT_GAP_COUNT = "@@leftGapCount",
  INTERNAL_GAP_COUNT = "@@internalGapCount",
  RIGHT_GAP_COUNT = "@@rightGapCount",
};

export type TAnnotations = {
  [DEFAULT_ANNOTATION_FIELDS.ID]: string,
  [DEFAULT_ANNOTATION_FIELDS.ACTUAL_ID]: string,
  [DEFAULT_ANNOTATION_FIELDS.DESCRIPTION]?: string,
  [DEFAULT_ANNOTATION_FIELDS.BEGIN]?: number,
  [DEFAULT_ANNOTATION_FIELDS.END]?: number,
  [DEFAULT_ANNOTATION_FIELDS.LINK]?: string,
  [key: string]: string | number | undefined,
}

type TAnnotationParser = {
  pattern: RegExp, 
  name: string, 
  toUrl: (actualId: string, matches: RegExpMatchArray) => string,
  parseAnnotations: (actualId: string, desc: string) => Partial<TAnnotations>,
}

const SEQUENCE_ANNOTATION_PARSERS: TAnnotationParser[] = [{
  name: "UniProt",
  pattern: /^sp\|([OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9](?:[A-Z][A-Z0-9]{2}[0-9]){1,2})\|([A-Z0-9]{1,5}_[A-Z0-9]{1,5})$/,
  toUrl: (actualId, m) => `https://www.uniprot.org/uniprotkb?query=${m[1]}`,
  parseAnnotations: parseAnnotationFieldsFromUniProtDescription,
}, {
  name: "UniProt",
  pattern: /^tr\|([OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9](?:[A-Z][A-Z0-9]{2}[0-9]){1,2})\|\1_[A-Z0-9]{1,5}$/,
  toUrl: (actualId, m) => `https://www.uniprot.org/uniprotkb?query=${m[1]}`,
  parseAnnotations: parseAnnotationFieldsFromUniProtDescription,
}, {
  name: "UniProt",
  pattern: /^([OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9](?:[A-Z][A-Z0-9]{2}[0-9]){1,2})(?:\.(\d+))?$/,
  toUrl: (actualId, m) => `https://www.uniprot.org/uniprotkb?query=${m[1]}`,
  parseAnnotations: parseAnnotationFieldsFromUniProtDescription,
}, {
  name: "UniRef",
  pattern: /^(UniRef(?:100|90|50)_(?:[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9](?:[A-Z][A-Z0-9]{2}[0-9]){1,2}|UPI[A-Z0-9]+))(?:\.(\d+))?$/,
  toUrl: (actualId, m) => `https://www.uniprot.org/uniref?query=${m[1]}`,
  parseAnnotations: parseAnnotationFieldsFromUniProtDescription,
}, {
  name: "UniProt",
  pattern: /^([A-Z0-9]{1,5}_[A-Z0-9]{1,5})(?:\.(\d+))?$/,
  toUrl: (actualId, m) => `https://www.uniprot.org/uniprotkb?query=${m[1]}`,
  parseAnnotations: parseAnnotationFieldsFromUniProtDescription,
}, {
  name: "UniParc",
  pattern: /^(UPI[A-Z0-9]+)(?:\.(\d+))?$/,
  toUrl: (actualId, m) => `https://www.uniprot.org/uniparc?query=${m[1]}`,
  parseAnnotations: parseAnnotationFieldsDefault,
}, {
  name: "MGnify",
  pattern: /^(MGYS\d+)(?:\.(\d+))?$/,
  toUrl: (actualId, m) => `https://www.ebi.ac.uk/metagenomics/studies/${m[1]}`,
  parseAnnotations: parseAnnotationFieldsDefault,
}];

export function formatFieldName(fieldName: string): string {
  let formattedFieldName: string = fieldName.replace(/@/g, "").trim()
  formattedFieldName = formattedFieldName.charAt(0).toUpperCase() + formattedFieldName.slice(1)
  formattedFieldName = formattedFieldName.replace(/([a-z])([A-Z])/g, '$1 $2');
  formattedFieldName = formattedFieldName.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
  return formattedFieldName
}

function parseAnnotationFieldsDefault(actualId: string, desc: string): Partial<TAnnotations> {
  const annotations: Partial<TAnnotations> = {};
  if (desc) {
    annotations[DEFAULT_ANNOTATION_FIELDS.DESCRIPTION] = desc;
  }

  return annotations;
}

function parseAnnotationFieldsUniProtStyle(actualId: string, desc: string): Partial<TAnnotations> {
  const annotations: Partial<TAnnotations> = {};

  const matches = Array.from(desc.matchAll(/(\S+)=(.+?)(?=\s+\S+=|$)/g));
  let description = desc;
  if (matches.length > 0) {
    description = desc.substring(0, matches[0].index);
  }
  
  if (description) {
    annotations[DEFAULT_ANNOTATION_FIELDS.DESCRIPTION] = description;
  }

  for (const m of matches) {
    annotations[m[1]] = m[2];
  }

  return annotations;
}

const UNIPROT_FIELD_NAMES: Record<string, string> = {
  "OS": "Organism",
  "OX": "Organism ID",
  "GN": "Gene",
  "PE": "Evidence",
  "SV": "Ver",
  "n": "Members",
  "Tax": "Taxon",
  "TaxID": "Taxon ID",
  "RepID": "Representative",
  "status": "Status",
};

const UNIPROT_PROTEIN_EXISTENCE: Record<string, string> = {
  1: "Protein",
  2: "Transcript",
  3: "Homology",
  4: "Predicted",
  5: "Uncertain",
};

function parseAnnotationFieldsFromUniProtDescription(actualId: string, desc: string): Partial<TAnnotations> {
  const annotations = parseAnnotationFieldsUniProtStyle(actualId, desc);
  for (const field of Object.keys(annotations)) {
    if ((field === "PE") && (annotations["PE"] !== undefined) && (annotations["PE"] in UNIPROT_PROTEIN_EXISTENCE)) {
      annotations["PE"] = UNIPROT_PROTEIN_EXISTENCE[annotations["PE"]];
    }
    
    if (field in UNIPROT_FIELD_NAMES) {
      annotations[UNIPROT_FIELD_NAMES[field]] = annotations[field];
      delete annotations[field];
    }
  }

  return annotations;
}

function isGapChar(char: string): boolean {
  return ((char === "-") || (char === "."));
}

function calcSequenceLength(sequenceString: string) {
  let realLength = 0, gapCount = 0, leftGapCount = 0, internalGapCount = 0, rightGapCount = 0;
  let internal = false;
  for (let i = 0; i < sequenceString.length; ++i) {
    if (isGapChar(sequenceString[i])) {
      ++gapCount;
    } else {
      ++realLength;
      if (!internal) {
        internal = true;
        leftGapCount = gapCount;
        gapCount = 0;
      } else if (gapCount > 0) {
        internalGapCount += gapCount;
        gapCount = 0;
      }
    }
  }
  rightGapCount = gapCount;
  const alignedLength = sequenceString.length - leftGapCount - rightGapCount;
  // const realLength = alignedLength - internalGapCount

  return {
    realLength,
    alignedLength,
    leftGapCount,
    internalGapCount,
    rightGapCount,
  };
}

export function parseSequenceAnnotations(id: string, sequence: string, desc?: string): TAnnotations {
  const {
    realLength,
    alignedLength,
    leftGapCount,
    internalGapCount,
    rightGapCount,
  } = calcSequenceLength(sequence);

  let actualId = id, begin = 1, end = realLength;
  const m = id.match(/^([^/]*)\/(\d+)-(\d+)$/);
  if (m) {
    actualId = m[1];
    begin = Number(m[2]);
    end = Number(m[3]);
  }

  const annotations: TAnnotations = {
    [DEFAULT_ANNOTATION_FIELDS.ID]: id,
    [DEFAULT_ANNOTATION_FIELDS.ACTUAL_ID]: actualId,
    [DEFAULT_ANNOTATION_FIELDS.BEGIN]: begin,
    [DEFAULT_ANNOTATION_FIELDS.END]: end, 
    [DEFAULT_ANNOTATION_FIELDS.LINK]: undefined,
    [DEFAULT_ANNOTATION_FIELDS.REAL_LENGTH]: realLength,
    [DEFAULT_ANNOTATION_FIELDS.ALIGNED_LENGTH]: alignedLength,
    [DEFAULT_ANNOTATION_FIELDS.LEFT_GAP_COUNT]: leftGapCount,
    [DEFAULT_ANNOTATION_FIELDS.INTERNAL_GAP_COUNT]: internalGapCount,
    [DEFAULT_ANNOTATION_FIELDS.RIGHT_GAP_COUNT]: rightGapCount,
  };

  let parserMatched = false;
  for (const parser of SEQUENCE_ANNOTATION_PARSERS) {
    const m = actualId.match(parser.pattern);
    if (!m) {
      continue;
    }

    parserMatched = true;
    annotations[DEFAULT_ANNOTATION_FIELDS.LINK] = parser.toUrl(actualId, m);

    if (desc) {
      const _annotations = parser.parseAnnotations(actualId, desc);
      Object.assign(annotations, _annotations);
    }
  }

  if (!parserMatched && desc) {
    const _annotations = parseAnnotationFieldsUniProtStyle(actualId, desc);
    Object.assign(annotations, _annotations);
  }

  return annotations;
}

