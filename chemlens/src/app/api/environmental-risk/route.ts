// src/app/api/environmental-risk/route.ts
import { NextResponse } from "next/server";

// --- Interfaces ---  
interface PubChemProperty {
    MolecularWeight?: number;
    IUPACName?: string;
    InChI?: string;
    MolecularFormula?: string;
}
 
interface RiskResult {
    score: number;
    riskLevel: "Low" | "Medium" | "High" | "Unknown";
    reasons: string[];
}
interface ApiResponseData {
    query: string;
    queryType: string;
    cid: number;
    compoundName: string;
    risk: RiskResult;
    properties: PubChemProperty;
    ghs: GHSInfo;
    toxicity: ToxicityInfo;
    environmental: EnvironmentalInfo;
    synonyms: string[];
    description?: string;
    pubChemUrl: string;
}
interface ApiError {
    error: string;
    details?: string;
}
interface CalculateRiskArgs {
    properties: PubChemProperty;
    ghs: GHSInfo;
    toxicity: ToxicityInfo;
    environmental: EnvironmentalInfo;
}
interface ExtractedInfo {
    ghs: GHSInfo;
    toxicity: ToxicityInfo;
    environmental: EnvironmentalInfo;
    synonyms: string[];
    foundIUPACName?: string;
    description?: string;
}
interface GHSInfo {
    symbols: { url: string; description: string }[];
    signalWord?: string;
    hazardStatements: string[];
    precautionaryStatements: string[];
}
interface ToxicityInfo {
    ld50: string[];
    lc50: string[];
    humanEffects: string[];
    animalEffects: string[];
}
interface EnvironmentalInfo {
    aquaticToxicity: string[];
    biodegradability: string[];
    bioaccumulation: string[];
}

// --- Helper Functions ---

function detectInputType(query: string): string {
    const trimmedQuery = query.trim();
    if (/^\d+$/.test(trimmedQuery)) {
        return 'cid';
    }
    if (/^([A-Z][a-z]?\d*)+$/.test(trimmedQuery) && trimmedQuery.length < 50) {
         if (/\d/.test(trimmedQuery) || /[A-Z].*[A-Z]/.test(trimmedQuery) || ['H', 'O', 'N', 'C', 'S', 'P', 'F', 'Cl', 'Br', 'I'].includes(trimmedQuery) ) {
              if (!/[^A-Za-z0-9]/.test(trimmedQuery)) {
                 return 'formula';
              }
         }
    }
    if (trimmedQuery.startsWith('InChI=')) {
         return 'inchi';
    }
    if (/^[A-Z]{14}-[A-Z]{10}-[A-Z]$/.test(trimmedQuery)) {
         return 'inchikey';
    }

    return 'name'; // Default to name
}

// **REVISED getCID function **
async function getCID(query: string, type: string): Promise<number | null> {
    const rawQuery = query.trim();
    const encodedQuery = encodeURIComponent(rawQuery);
    let url: string;

    console.log(`⏳ Fetching CID for query "${rawQuery}" (type: ${type})`);

    switch (type) {
        case 'cid': {
            const potentialCid = parseInt(rawQuery, 10);
            if (!isNaN(potentialCid) && potentialCid > 0) {
                console.log(`✅ Valid CID provided: ${potentialCid}`);
                return potentialCid;
            } else {
                console.error(`❌ Invalid CID format: "${rawQuery}"`);
                return null;
            }
        }

        case 'formula':
            url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/formula/${encodedQuery}/cids/JSON`;
            break;

        case 'inchi': {
            const postUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchi/cids/JSON`;
            console.log(`⏳ Sending POST to: ${postUrl}`);
            console.log(`🧪 POST Body: inchi=${rawQuery}`);
            
            const response = await fetch(postUrl, {
                method: 'POST',
                headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `inchi=${encodeURIComponent(rawQuery)}`, // Must be like: InChI%3D1S%2FHg
            });
            
            console.log("📦 response:", response.status, response.statusText);
            const data = await response.json();
            console.log("📬 Body:", data);


            // Check if data.IdentifierList and data.IdentifierList.CID exist
            const cid = data?.IdentifierList?.CID?.[0];

            if (!cid) {
                console.error(`❌ No CID found in response for query: "${rawQuery}"`);
                return null; // Or handle the error as needed
            }

            console.log(`✅ Found CID: ${cid}`);
            return cid;        
            }

        case 'inchikey':
            url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/${encodedQuery}/cids/JSON`;
            console.log(`   Constructed InChIKey URL: ${url}`);
            break;

        case 'name':
        default:
            url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodedQuery}/cids/JSON?name_type=complete`;
            break;
    }


    try {
        // Fetch logic remains the same
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) {
            const errorBody = await res.text().catch(() => "Could not read error body");
            console.warn(`⚠️ PubChem CID fetch failed for ${type} "${rawQuery}". Status: ${res.status} ${res.statusText}. URL: ${url}. Body: ${errorBody.substring(0,200)}`);

            // Fallback only for formula 404
            if (type === 'formula' && res.status === 404) {
                console.log(`⏳ Formula search failed (404), attempting name search for "${rawQuery}"...`);
                return getCID(rawQuery, 'name');
            }
            return null; // No automatic fallback for other failures
        }
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
             console.warn(`⚠️ PubChem CID fetch for ${type} "${rawQuery}" did not return JSON. Content-Type: ${contentType}`);
             return null;
        }
        const data = await res.json();
        const cid = data?.IdentifierList?.CID?.[0];
        if (cid && typeof cid === 'number' && cid > 0) {
            console.log(`✅ Found CID ${cid} via ${type} search.`);
            return cid;
        } else {
            console.warn(`⚠️ No CID found in PubChem response JSON for ${type} "${rawQuery}". Response structure:`, JSON.stringify(data).substring(0, 200));
             if (type === 'formula') {
                 console.log(`⏳ Formula search yielded no CID, attempting name search for "${rawQuery}"...`);
                 return getCID(rawQuery, 'name');
             }
            return null;
        }
    } catch (error: any) {
        console.error(`❌ Network/Fetch/Parse error during CID lookup for ${type} "${rawQuery}":`, error);
        return null;
    }
}



// --- getProperties function 
async function getProperties(cid: number): Promise<PubChemProperty> {
    const propsToFetch = [
        'MolecularWeight',
        'IUPACName',
        'InChI',
        'MolecularFormula',
    ].join(',');

    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/${propsToFetch}/JSON`;
    console.log(`Fetching properties from URL: ${url}`);

    try {
        const res = await fetch(url);
        console.log(`PubChem Property fetch status for CID ${cid}: ${res.status} ${res.statusText}`);

        if (!res.ok) {
            console.warn(`⚠️ PubChem property fetch failed. Status: ${res.status}`);
            try { const errorBody = await res.text(); console.warn(`⚠️ Error body (if any): ${errorBody.substring(0, 500)}`); } catch (e) { console.warn(`⚠️ Could not read error body.`); }
            return {};
        }

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
             console.warn(`⚠️ PubChem Property fetch for CID ${cid} did not return JSON. Content-Type: ${contentType}`);
             return {};
        }

        const data = await res.json();
        

        const properties = data?.PropertyTable?.Properties?.[0];

        if (properties && properties.CID === cid) {
             console.log(`Extracted properties for CID ${cid}: MW=${properties.MolecularWeight}, IUPAC=${properties.IUPACName}, Formula=${properties.MolecularFormula}, InChI=${properties.InChI ? 'Yes' : 'No'}`);
             const resultProps: PubChemProperty = {
                MolecularWeight: properties.MolecularWeight,
                IUPACName: properties.IUPACName,
                InChI: properties.InChI,
                MolecularFormula: properties.MolecularFormula
             };
             return resultProps;
        } else {
             console.warn(`⚠️ Properties data structure unexpected or missing for CID ${cid}. Raw data logged above.`);
             return {};
        }
    } catch (error: any) {
         console.error(`❌ Network/fetch error fetching properties from PubChem for CID ${cid}:`, error);
         throw new Error(`Failed to fetch properties for CID ${cid}: ${error.message}`, { cause: error });
    }
}

// --- extractChemicalInfo function  
function extractChemicalInfo(sections: any[]): ExtractedInfo {
    const result: ExtractedInfo = {
        ghs: { symbols: [], hazardStatements: [], precautionaryStatements: [] },
        toxicity: { ld50: [], lc50: [], humanEffects: [], animalEffects: [] },
        environmental: { aquaticToxicity: [], biodegradability: [], bioaccumulation: [] },
        synonyms: [],
        foundIUPACName: undefined,
        description: undefined,
    };

    const uniqueSymbols = new Set<string>();
    const uniqueHazardStatements = new Set<string>();
    const uniquePrecStatements = new Set<string>();
    const MAX_SYNONYMS = 10;
    const MAX_EXCERPTS = 5;
    let foundDescription = false;

    function crawl(node: any, path: string[] = []) {
        if (!node || typeof node !== 'object') return;

        const currentHeading: string = node.TOCHeading || "";
        const currentPath = [...path, currentHeading];
        const information: any[] = node.Information || [];

        try {
            // GHS Classification Section
            if (currentHeading === "GHS Classification") {
                // console.log(`🔍 Found GHS Classification section at path: ${currentPath.join(' > ')}`);
                (node.Section || []).forEach((ghsSubSection: any) => {
                    const subHeading = ghsSubSection.TOCHeading || "";
                    if (subHeading === "Pictograms" && ghsSubSection.Information) {
                        ghsSubSection.Information.forEach((item: any) => {
                            const pictograms = item.Value?.StringWithMarkup?.[0]?.Markup?.filter((m:any) => m.Type === 'Icon');
                            (pictograms || []).forEach((p: any) => {
                                if(p.URL && !uniqueSymbols.has(p.URL)) {
                                    result.ghs.symbols.push({ url: p.URL, description: p.Extra || 'GHS Pictogram' });
                                    uniqueSymbols.add(p.URL);
                                }
                            });
                        });
                    } else if (subHeading === "Signal Word" && ghsSubSection.Information) {
                         const signal = ghsSubSection.Information[0]?.Value?.StringWithMarkup?.[0]?.String;
                         if (signal) result.ghs.signalWord = signal;
                    } else if (subHeading === "GHS Hazard Statements" && ghsSubSection.Information) {
                        // console.log(`    -> Found GHS Hazard Statements subsection.`);
                        ghsSubSection.Information.forEach((item: any) => {
                            (item.Value?.StringWithMarkup || []).forEach((markup: any) => {
                               const str: string | undefined = markup.String;
                               if (str?.match(/^H\d{3}/)) {
                                   uniqueHazardStatements.add(str);
                               }
                            });
                        });
                    } else if (subHeading === "Precautionary Statement Codes" && ghsSubSection.Information) {
                        //  console.log(`    -> Found Precautionary Statement Codes subsection.`);
                         ghsSubSection.Information.forEach((item: any) => {
                             const str: string | undefined = item.Value?.StringWithMarkup?.[0]?.String;
                              if (str) {
                                 const codes = str.split(/,\s*|\n/).map(code => code.trim()).filter(Boolean);
                                 codes.forEach(code => uniquePrecStatements.add(code));
                             }
                          });
                    }
                });
            }

            // Direct Sections (Alternative/Fallback locations)
            if (currentHeading === "Hazards Identification" && !uniqueHazardStatements.size) {
                (node.Section || []).forEach((idSubSection: any) => {
                     if (idSubSection.TOCHeading === "GHS Hazard Statements" && idSubSection.Information) {
                        // console.log(`🔍 Found GHS Hazard Statements directly under Hazards Identification.`);
                        idSubSection.Information.forEach((item: any) => {
                            (item.Value?.StringWithMarkup || []).forEach((markup: any) => {
                                const str: string | undefined = markup.String;
                                if (str?.match(/^H\d{3}/)) {
                                    uniqueHazardStatements.add(str);
                                }
                            });
                        });
                     }
                     else if (idSubSection.TOCHeading === "GHS Classification" && idSubSection.Information) {
                         idSubSection.Information.forEach((item: any) => {
                             (item.Value?.StringWithMarkup || []).forEach((markup: any) => {
                                 const str: string | undefined = markup.String;
                                 if (str?.match(/^H\d{3}/)) {
                                     uniqueHazardStatements.add(str);
                                 }
                             });
                         });
                     }
                 });
            }
             if (currentHeading.includes("Hazard") && information.length > 0 && !uniqueHazardStatements.size) {
                information.forEach((item: any) => {
                     (item.Value?.StringWithMarkup || []).forEach((markup: any) => {
                        const str: string | undefined = markup.String;
                        if (str?.match(/^H\d{3}/)) {
                            console.warn(`⚠️ Found potential Hazard Statement "${str}" in generic section: ${currentPath.join(' > ')}`);
                            uniqueHazardStatements.add(str);
                        }
                     });
                });
            }
             if (currentHeading.includes("Precaution") && information.length > 0 && !uniquePrecStatements.size) {
                 information.forEach((item: any) => {
                     const str: string | undefined = item.Value?.StringWithMarkup?.[0]?.String;
                     if (str) {
                         const codes = str.split(/,\s*|\n/).map(code => code.trim()).filter(c => c.startsWith('P'));
                         if (codes.length > 0) {
                             console.warn(`⚠️ Found potential Precautionary Codes in generic section: ${currentPath.join(' > ')}`);
                              codes.forEach(code => uniquePrecStatements.add(code));
                         }
                     }
                 });
             }

            // Toxicity Data
            const toxHeadings = ["Toxicity", "Toxicological Information", "Acute Effects", "Human Toxicity Excerpts", "Non-Human Toxicity Excerpts", "Health Hazard"];
            if (toxHeadings.some(h => currentHeading.includes(h))) {
                 information.forEach((item: any) => {
                     const valueStr: string = item.Value?.StringWithMarkup?.[0]?.String || "";
                     if (valueStr) {
                         if (result.toxicity.ld50.length < MAX_EXCERPTS && valueStr.match(/LD(?:50|.?LO)/i)) result.toxicity.ld50.push(valueStr);
                         if (result.toxicity.lc50.length < MAX_EXCERPTS && valueStr.match(/LC(?:50|.?LO)/i)) result.toxicity.lc50.push(valueStr);
                         if (result.toxicity.humanEffects.length < MAX_EXCERPTS && currentHeading === "Human Toxicity Excerpts") result.toxicity.humanEffects.push(valueStr);
                         if (result.toxicity.animalEffects.length < MAX_EXCERPTS && currentHeading === "Non-Human Toxicity Excerpts") result.toxicity.animalEffects.push(valueStr);
                     }
                 });
             }

             // Environmental Data
             const envHeadings = ["Ecotoxicity", "Environmental Fate", "Ecotoxicity Values", "Environmental Biodegradation", "Environmental Bioconcentration", "Bioaccumulation", "Ecological Information"];
             if (envHeadings.some(h => currentHeading.includes(h))) {
                 information.forEach((item: any) => {
                     const valueStr: string = item.Value?.StringWithMarkup?.[0]?.String || "";
                     if (valueStr) {
                         if (result.environmental.aquaticToxicity.length < MAX_EXCERPTS && (valueStr.match(/(?:LC|EC|IC|ErC|NOEC|LOEC).?50/i) || valueStr.toLowerCase().includes("aquatic"))) {
                            result.environmental.aquaticToxicity.push(valueStr);
                         }
                         if (result.environmental.biodegradability.length < MAX_EXCERPTS && (valueStr.toLowerCase().includes("biodegrad") || valueStr.toLowerCase().includes("persist"))) {
                             result.environmental.biodegradability.push(valueStr);
                         }
                         if (result.environmental.bioaccumulation.length < MAX_EXCERPTS && (valueStr.toLowerCase().includes("accumul") || valueStr.toLowerCase().includes("bcf") || valueStr.toLowerCase().includes("bioconcentration"))) {
                             result.environmental.bioaccumulation.push(valueStr);
                         }
                     }
                 });
             }

            // Synonyms, IUPAC Name, Description
            if (currentHeading === "Names and Identifiers") {
                 (node.Section || []).forEach((subSection: any) => {
                    const subHeading: string = subSection.TOCHeading || "";
                     const subInfo: any[] = subSection.Information || [];
                     const subSubSections: any[] = subSection.Section || [];

                     if (!result.foundIUPACName && subHeading === "Computed Descriptors") {
                         (subSection.Section || []).forEach((compDesc: any) => {
                             if (compDesc.TOCHeading === "IUPAC Name" && compDesc.Information) {
                                  const iupac: string | undefined = compDesc.Information[0]?.Value?.StringWithMarkup?.[0]?.String;
                                  if (iupac) result.foundIUPACName = iupac;
                             }
                         });
                     }
                     else if (!result.foundIUPACName && subHeading === "IUPAC Name") {
                         const iupac: string | undefined = subInfo[0]?.Value?.StringWithMarkup?.[0]?.String;
                         if (iupac) result.foundIUPACName = iupac;
                     }
                     else if (subHeading.includes("Synonyms")) {
                         subInfo.forEach((item: any) => {
                             const syn: string | undefined = item.Value?.StringWithMarkup?.[0]?.String;
                             if (syn && result.synonyms.length < MAX_SYNONYMS) result.synonyms.push(syn);
                         });
                         subSubSections.forEach((synSection: any) => {
                             (synSection.Information || []).forEach((infoItem: any) => {
                                 if (infoItem.Value?.StringWithMarkup && Array.isArray(infoItem.Value.StringWithMarkup)) {
                                     infoItem.Value.StringWithMarkup.forEach((markupItem: any) => {
                                         const syn: string | undefined = markupItem.String;
                                         if (syn && result.synonyms.length < MAX_SYNONYMS) result.synonyms.push(syn);
                                     });
                                 } else {
                                     const syn: string | undefined = infoItem.Value?.StringWithMarkup?.[0]?.String;
                                     if (syn && result.synonyms.length < MAX_SYNONYMS) result.synonyms.push(syn);
                                 }
                             });
                         });
                    }
                     else if (subHeading === "Record Description" && !foundDescription) {
                        // console.log(`🔍 Found Record Description section for potential description extraction.`);
                        let preferredDesc: string | undefined = undefined;
                        let firstDesc: string | undefined = undefined;
                        let ref43Desc: string | undefined = undefined;
                        let ref72Desc: string | undefined = undefined;
                        let ref8Desc: string | undefined = undefined;

                        for (const item of subInfo) {
                             const descValue = item.Value?.StringWithMarkup?.[0]?.String;
                             if (descValue) {
                                if (!firstDesc) firstDesc = descValue;
                                if (item.Description === "Physical Description") ref8Desc = descValue;
                                else if (item.Description === "Hazards Summary" && !preferredDesc) preferredDesc = descValue;
                                else if (item.ReferenceNumber === 43) ref43Desc = descValue;
                                else if (item.ReferenceNumber === 72) ref72Desc = descValue;
                             }
                        }
                        if (ref8Desc) {
                             result.description = ref8Desc;
                            //  console.log(`    * Extracted Physical Description.`);
                             foundDescription = true;
                        } else if (preferredDesc) {
                            result.description = preferredDesc;
                            // console.log(`    * Extracted Hazards Summary description.`);
                            foundDescription = true;
                        } else if (ref43Desc) {
                            result.description = ref43Desc;
                            // console.log(`    * Extracted fallback description (Ref 43).`);
                            foundDescription = true;
                         } else if (ref72Desc) {
                            result.description = ref72Desc;
                            // console.log(`    * Extracted fallback description (Ref 72 - MeSH).`);
                            foundDescription = true;
                         } else if (firstDesc) {
                            result.description = firstDesc;
                            // console.log(`    * Extracted first available description from 'Record Description' section.`);
                            foundDescription = true;
                         }
                    }
                 });
            }

        } catch (parseError: any) {
             console.warn(`⚠️ Error parsing section "${currentHeading}" (Path: ${currentPath.join(' > ')}): ${parseError.message}`);
         }

        // Recurse
        if (Array.isArray(node.Section) && !foundDescription) {
            node.Section.forEach((child: any) => crawl(child, currentPath));
        } else if (Array.isArray(node.Section) && foundDescription && currentHeading !== "Record Description") {
             node.Section.forEach((child: any) => crawl(child, currentPath));
        }
    }

    sections.forEach(section => crawl(section));

    result.ghs.hazardStatements = [...uniqueHazardStatements];
    result.ghs.precautionaryStatements = [...uniquePrecStatements];
    result.toxicity.ld50 = [...new Set(result.toxicity.ld50)].slice(0, MAX_EXCERPTS);
    result.toxicity.lc50 = [...new Set(result.toxicity.lc50)].slice(0, MAX_EXCERPTS);
    result.toxicity.humanEffects = [...new Set(result.toxicity.humanEffects)].slice(0, MAX_EXCERPTS);
    result.toxicity.animalEffects = [...new Set(result.toxicity.animalEffects)].slice(0, MAX_EXCERPTS);
    result.environmental.aquaticToxicity = [...new Set(result.environmental.aquaticToxicity)].slice(0, MAX_EXCERPTS);
    result.environmental.biodegradability = [...new Set(result.environmental.biodegradability)].slice(0, MAX_EXCERPTS);
    result.environmental.bioaccumulation = [...new Set(result.environmental.bioaccumulation)].slice(0, MAX_EXCERPTS);
    result.synonyms = [...new Set(result.synonyms)].slice(0, MAX_SYNONYMS);

    console.log(`ℹ️ Final extracted Hazard Statements (${result.ghs.hazardStatements.length}):`, result.ghs.hazardStatements);
    console.log(`ℹ️ Final extracted Precautionary Statements (${result.ghs.precautionaryStatements.length}):`, result.ghs.precautionaryStatements);
    console.log(`ℹ️ Final extracted Description: ${result.description ? result.description.substring(0, 50) + '...' : 'None'}`);

    return result;
}

// --- calculateRisk function (no changes needed) ---
function calculateRisk({ properties, ghs, toxicity, environmental }: CalculateRiskArgs): RiskResult {
    let score = 0;
    const reasons: string[] = [];
    const maxScore = 100;

    let ghsHealthScore = 0;
    let ghsEnvScore = 0;
    const severeHealthHazards = new Set<string>();
    const moderateHealthHazards = new Set<string>();
    const envHazards = new Set<string>();

    // GHS Hazard Analysis
    ghs.hazardStatements.forEach(h => {
        const codeMatch = h.match(/^(H\d{3})/);
        if (!codeMatch) return;
        const hCode = codeMatch[1];

        const severeHealthCodes = ['H300', 'H310', 'H330', 'H301', 'H311', 'H331', 'H340', 'H350', 'H360', 'H370', 'H372'];
        const moderateHealthCodes = ['H302', 'H312', 'H332', 'H314', 'H318', 'H334', 'H317', 'H341', 'H351', 'H361', 'H371', 'H373'];
        const highEnvCodes = ['H400', 'H410', 'H290']; // Added H290 here as env/material hazard
        const mediumEnvCodes = ['H401', 'H411'];
        const lowEnvCodes = ['H402', 'H412', 'H413'];

        if (severeHealthCodes.includes(hCode)) { ghsHealthScore += 15; severeHealthHazards.add(h); }
        else if (moderateHealthCodes.includes(hCode)) { ghsHealthScore += 7; moderateHealthHazards.add(h); }
        // Updated env check
        else if (hCode.startsWith('H4') || hCode === 'H290') {
            if (highEnvCodes.includes(hCode)) { ghsEnvScore += 15; }
            else if (mediumEnvCodes.includes(hCode)) { ghsEnvScore += 10; }
            else if (lowEnvCodes.includes(hCode)) { ghsEnvScore += 5; }
            envHazards.add(h); // Add H290 to env hazards for reporting
        }
    });

    score += Math.min(ghsHealthScore, 40);
    score += Math.min(ghsEnvScore, 25); // Keep max contribution lower for env

    if (severeHealthHazards.size > 0) reasons.push(`GHS: Contains severe health hazards (e.g., ${[...severeHealthHazards][0].split(':')[0]}...).`);
    if (moderateHealthHazards.size > 0) reasons.push(`GHS: Contains moderate health hazards (e.g., ${[...moderateHealthHazards][0].split(':')[0]}...).`);
    if (envHazards.size > 0) {
         const envExamples = [...envHazards].map(h => h.split(':')[0]); // Show H codes
         if(envHazards.has('H290')) {
             reasons.push(`GHS: Classified as corrosive to metals and/or hazardous to the aquatic environment (e.g., ${envExamples[0]}...).`);
         } else {
             reasons.push(`GHS: Classified as hazardous to the aquatic environment (e.g., ${envExamples[0]}...).`);
         }
    }


    // Property-Based Heuristics
    const isHalogenated = properties?.InChI && /[Ff]l?|[Cc]l|[Bb]r|[Ii]/.test(properties.InChI);
    if (properties?.MolecularWeight && properties.MolecularWeight > 500 && isHalogenated) {
        score += 10;
        reasons.push("High Molecular Weight (>500 Da) with halogenation suggests potential persistence.");
    } else if (properties?.MolecularWeight && properties.MolecularWeight > 700) {
        score += 5;
        reasons.push("Very High Molecular Weight (>700 Da) may indicate persistence.");
    }

    // Other Data Indicators
    const isPersistent = environmental.biodegradability.some(b => b.toLowerCase().includes("not readily biodegradable") || b.toLowerCase().includes("persistent"));
    const isBioaccumulative = environmental.bioaccumulation.length > 0;

    if (isPersistent) {
        score += 10;
        reasons.push("Data indicates persistence/low biodegradability.");
    } else if (environmental.biodegradability.length > 0) {
        score += 2; // Small score even if explicitly biodegradable
    }

    if (isBioaccumulative) {
        score += 8;
        reasons.push("Bioaccumulation potential indicated by data.");
    }

    if (toxicity.ld50.length > 0 || toxicity.lc50.length > 0 || toxicity.humanEffects.length > 0 || toxicity.animalEffects.length > 0) {
        score += 5;
        if(ghsHealthScore < 10) { // Only add reason if GHS didn't already flag high toxicity
            reasons.push("Toxicity data found (check details/GHS).");
        }
    }

    // Determine Risk Level
    const finalScore = Math.max(0, Math.min(Math.round(score), maxScore));
    let riskLevel: RiskResult["riskLevel"];

    const highThreshold = 65;
    const mediumThreshold = 30;

    if (finalScore >= highThreshold) { riskLevel = "High"; }
    else if (finalScore >= mediumThreshold) { riskLevel = "Medium"; }
    else { riskLevel = "Low"; }

    const hasAnyHazardData = ghs.hazardStatements.length > 0 ||
                             toxicity.ld50.length > 0 || toxicity.lc50.length > 0 || toxicity.humanEffects.length > 0 ||
                             environmental.aquaticToxicity.length > 0 || isPersistent || isBioaccumulative;

    if (finalScore < 5 && !hasAnyHazardData) {
        riskLevel = "Unknown";
        reasons.splice(0, reasons.length); // Clear any minor property-based reasons
        reasons.push("Insufficient specific hazard data found in PubChem record for a comprehensive risk assessment.");
    } else if (riskLevel === "Low" && reasons.length === 0) {
         reasons.push("No significant environmental or health hazards identified from available GHS, property, and toxicity/environmental excerpts.");
    }

    return { score: finalScore, riskLevel, reasons };
}

// --- Main Handler (GET Function) ---
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");

    if (!query) {
        return NextResponse.json<ApiError>({ error: "Missing compound query (name, CID, formula, or InChI)" }, { status: 400 });
    }

    const inputType = detectInputType(query);
    console.log(`🔍 Received query: "${query}", detected type: "${inputType}"`);

    try {
        const cid = await getCID(query, inputType);
        if (!cid) {
            console.error(`❌ CID not found for query: "${query}" (type: ${inputType})`);
            let notFoundMessage = `Could not find a PubChem Compound ID for the ${inputType} query: "${query}".`;
            if (inputType === 'cid') notFoundMessage = `CID "${query}" not found or invalid.`;
            if (inputType === 'formula') notFoundMessage = `No compound found for formula "${query}". Check formatting or try the name.`;
            if (inputType === 'name') notFoundMessage = `Compound name "${query}" not found. Check spelling or try a synonym/CID/formula.`;
            if (inputType === 'inchi') notFoundMessage = `InChI string "${query}" did not resolve to a CID. Check formatting or try another identifier.`;

            return NextResponse.json<ApiError>({ error: notFoundMessage }, { status: 404 });
        }
        console.log(`✅ Found CID: ${cid}`);
        const pubChemUrl = `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`;

        console.log(`⏳ Fetching properties via /property/ endpoint for CID: ${cid}`);
        const properties = await getProperties(cid);
        console.log(`✅ Properties returned from getProperties:`, JSON.stringify(properties));

        console.log(`⏳ Fetching full PUG View data for CID: ${cid}`);
        const fullDataUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${cid}/JSON`;
        const fullDataRes = await fetch(fullDataUrl);

        let sections: any[] = [];
        if (!fullDataRes.ok) {
            console.error(`❌ Failed to fetch full PUG View data for CID ${cid}: ${fullDataRes.status} ${fullDataRes.statusText}`);
             console.warn(`⚠️ Proceeding with potentially incomplete data.`);
            if(Object.keys(properties).length === 0) {
                 console.error("❌ Both property fetch and PUG View fetch failed. Cannot proceed.");
                 return NextResponse.json<ApiError>({ error: "Failed to retrieve essential data from PubChem.", details: `Property fetch failed, PUG View status: ${fullDataRes.status}` }, { status: 503 });
            }
        } else {
            try {
                const fullData = await fullDataRes.json();
                sections = fullData?.Record?.Section || [];
                console.log(`✅ Successfully fetched and parsed full data (${sections.length} top-level sections)`);
            } catch(jsonError: any) {
                 console.error(`❌ Failed to parse JSON from PUG View response for CID ${cid}: ${jsonError.message}`);
                 console.warn(`⚠️ Proceeding with potentially incomplete data.`);
                 if(Object.keys(properties).length === 0) {
                      console.error("❌ Property fetch failed and PUG View JSON parsing failed. Cannot proceed.");
                      return NextResponse.json<ApiError>({ error: "Failed to retrieve or parse essential data from PubChem.", details: `PUG View JSON parse error: ${jsonError.message}` }, { status: 500 });
                 }
            }
        }

        console.log(`⏳ Extracting additional info from PUG View sections...`);
        const extractedData = extractChemicalInfo(sections);
        console.log(`✅ Extracted GHS:`, JSON.stringify(extractedData.ghs));
        // console.log(`✅ Extracted Toxicity:`, JSON.stringify(extractedData.toxicity)); // Reduce verbosity
        // console.log(`✅ Extracted Environmental:`, JSON.stringify(extractedData.environmental)); // Reduce verbosity
        console.log(`✅ Extracted Synonyms:`, JSON.stringify(extractedData.synonyms));
        console.log(`✅ Extracted Fallback IUPAC Name:`, extractedData.foundIUPACName);
        console.log(`✅ Extracted Description: ${extractedData.description ? 'Yes' : 'No'}`);


        if (extractedData.foundIUPACName && !properties.IUPACName) {
            console.log(`✅ Using fallback IUPAC Name from PUG View (${extractedData.foundIUPACName}) as primary property fetch missed it.`);
            properties.IUPACName = extractedData.foundIUPACName;
        }
         const compoundName = properties.IUPACName || (extractedData.synonyms.length > 0 ? extractedData.synonyms[0] : `Compound CID ${cid}`);


        console.log(`⏳ Calculating risk...`);
        const risk = calculateRisk({
            properties,
            ghs: extractedData.ghs,
            toxicity: extractedData.toxicity,
            environmental: extractedData.environmental,
        });
        console.log(`✅ Calculated Risk:`, JSON.stringify(risk));

        const responseData: ApiResponseData = {
            query: query,
            queryType: inputType,
            cid: cid,
            compoundName: compoundName,
            risk: risk,
            properties: properties,
            ghs: extractedData.ghs,
            toxicity: extractedData.toxicity,
            environmental: extractedData.environmental,
            synonyms: extractedData.synonyms,
            description: extractedData.description,
            pubChemUrl: pubChemUrl,
        };

        console.log("✅ Sending API response.");
        return NextResponse.json(responseData);

    } catch (err: any) {
        console.error("❌ SERVER ERROR in GET handler:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorDetails = err.cause ? ` Cause: ${err.cause}` : (err.stack ? ` Stack: ${err.stack.substring(0, 300)}...` : '');

        if (errorMessage.toLowerCase().includes('fetch') || errorMessage.toLowerCase().includes('pubchem') || (err.cause && typeof err.cause === 'string' && err.cause.toLowerCase().includes('fetch'))) {
             console.error("❌ PubChem API communication error suspected.");
             return NextResponse.json<ApiError>({ error: "Error communicating with PubChem API. Please try again later.", details: `${errorMessage}` }, { status: 503 });
        }
        return NextResponse.json<ApiError>({ error: "An internal server error occurred processing the request.", details: `${errorMessage}${errorDetails}` }, { status: 500 });
    }
}