// src/components/EnvironmentalRisk.tsx
"use client";
import { useState } from 'react';
import styles from './EnvironmentalRisk.module.css';

// My interface should match the final ApiResponseData from my backend(reminder)
interface ApiData {
    query: string;
    queryType: string;
    cid: number;
    compoundName: string;
    risk: {
        score: number;
        riskLevel: "Low" | "Medium" | "High" | "Unknown";
        reasons: string[];
    };
    properties: {
        MolecularWeight?: number;
        IUPACName?: string;
        InChI?: string;
        MolecularFormula?: string;
    };
    ghs: {
        symbols: { url: string; description: string }[];
        signalWord?: string;
        hazardStatements: string[];
        precautionaryStatements: string[]; // Expecting codes now Pxxx
    };
    toxicity: {
        ld50: string[];
        lc50: string[];
        humanEffects: string[];
        animalEffects: string[];
    };
    environmental: {
        aquaticToxicity: string[];
        biodegradability: string[];
        bioaccumulation: string[];
    };
    synonyms: string[];
    description?: string; // Added description
    pubChemUrl: string;
}


const EnvironmentalRisk = () => {
    const [query, setQuery] = useState('');
    const [data, setData] = useState<ApiData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event?: React.FormEvent) => {
        if(event) event.preventDefault();
        const trimmedQuery = query.trim();
        if (!trimmedQuery) {
            setError("Please enter a compound name, CID, or formula.");
            return;
        }

        setLoading(true);
        setError(null);
        setData(null); // Clear previous results

        try {
            const res = await fetch(`/api/environmental-risk?query=${encodeURIComponent(trimmedQuery)}`);
            const result = await res.json();
            console.log("API Response Received:", result);

            if (res.ok && result && !result.error) {
                setData(result as ApiData);
            } else {
                 const apiErrorMsg = result?.error || `Failed to fetch data (Status: ${res.status})`;
                 const apiErrorDetails = result?.details || res.statusText;
                 setError(`${apiErrorMsg}${apiErrorDetails ? ` - Details: ${apiErrorDetails}` : ''}`);
                 console.error("API Error Response:", result || res);
            }
        } catch (err: any) {
            console.error("Fetch error:", err);
            setError(`Network error: Could not connect to the assessment service. Please check your connection or try again later. (${err.message})`);
        } finally {
            setLoading(false);
        }
    };

    const getRiskClass = (level: ApiData['risk']['riskLevel']): string => {
        switch (level) {
            case 'High': return styles.riskHigh;
            case 'Medium': return styles.riskMedium;
            case 'Low': return styles.riskLow;
            case 'Unknown': return styles.riskUnknown;
            default: return styles.riskUnknown;
        }
    };

    const getHazardStatementText = (hStatement: string): string => {
        const knownStatements: { [key: string]: string } = {
            'H300': 'Fatal if swallowed', 'H301': 'Toxic if swallowed', 'H302': 'Harmful if swallowed',
            'H310': 'Fatal in contact with skin', 'H311': 'Toxic in contact with skin', 'H312': 'Harmful in contact with skin',
            'H314': 'Causes severe skin burns and eye damage', 'H317': 'May cause an allergic skin reaction', 'H318': 'Causes serious eye damage',
            'H330': 'Fatal if inhaled', 'H331': 'Toxic if inhaled', 'H332': 'Harmful if inhaled', 'H334': 'May cause allergy or asthma symptoms or breathing difficulties if inhaled',
            'H340': 'May cause genetic defects', 'H341': 'Suspected of causing genetic defects',
            'H350': 'May cause cancer', 'H351': 'Suspected of causing cancer',
            'H360': 'May damage fertility or the unborn child', 'H361': 'Suspected of damaging fertility or the unborn child',
            'H370': 'Causes damage to organs', 'H371': 'May cause damage to organs', 'H372': 'Causes damage to organs through prolonged or repeated exposure', 'H373': 'May cause damage to organs through prolonged or repeated exposure',
            'H400': 'Very toxic to aquatic life', 'H410': 'Very toxic to aquatic life with long lasting effects',
            'H411': 'Toxic to aquatic life with long lasting effects', 'H412': 'Harmful to aquatic life with long lasting effects',
            'H290': 'May be corrosive to metals', // Added H290
        };
        const codeMatch = hStatement.match(/^(H\d{3})/);
        if (codeMatch && knownStatements[codeMatch[1]]) {
            return knownStatements[codeMatch[1]];
        }
        // Attempt to extract description part if present after code
        const descriptionPart = hStatement.replace(/^(H\d{3})\s*(\(\d+(\.\d+)?%\))?:\s*/, '').replace(/\[.*?\]$/, '').trim();
        if (descriptionPart && descriptionPart !== codeMatch?.[0]) {
             return descriptionPart;
        }
        return hStatement; // Return original if no better text found
    };

    const handleClearInput = () => {
        setQuery('');
        // Optional: Focus the input again after clearing
        document.getElementById('chemical-input')?.focus();
    };

    return (
        <div className={styles.container}>
            <h1>🧪 ChemLens Risk Assessor</h1>
            <p className={styles.description}>
                Enter a chemical name, PubChem CID, formula, or other identifier to assess its potential safety and environmental risks based on PubChem data.
            </p>
            <p className={styles.explanationText}>
                ℹ️ This tool provides a heuristic risk score (0-100) derived from GHS classifications, persistence indicators, and toxicity/environmental data presence from PubChem. It is intended as an initial screening aid and **not** a substitute for a full risk assessment or expert consultation. See project README for scoring details.
            </p>

            <form onSubmit={handleSubmit} className={styles.inputGroup}>
                {/* Wrap input and button in a relative container */}
                <div className={styles.inputWrapper}>
                    <input
                        id="chemical-input" // Added id for focusing
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="e.g., DDT, Aspirin, 2244, C9H8O4, Benzene, InChI=..."
                        disabled={loading}
                        className={styles.inputField}
                        aria-label="Chemical Identifier Input"
                    />
                    {/* Conditionally render clear button */}
                    {query && !loading && (
                        <button
                            type="button" // Important: prevent form submission
                            onClick={handleClearInput}
                            className={styles.clearButton}
                            aria-label="Clear search input"
                            title="Clear search"
                        >
                            × {/* HTML entity for 'X' */}
                        </button>
                    )}
                </div>
                <button type="submit" disabled={loading || !query.trim()} className={styles.submitButton}>
                    {loading ? "🔍 Assessing..." : "Assess Risk"}
                </button>
            </form>

            {error && <p className={`${styles.message} ${styles.errorText}`}>⚠️ Error: {error}</p>}
            {loading && <div className={`${styles.message} ${styles.loader}`}>Fetching and analyzing data from PubChem...</div>}

            {data && (
                <div className={styles.resultsContainer}>
                    <h2>Assessment for: {data.compoundName}</h2>
                    <p className={styles.subHeader}>
                        (Query: "{data.query}", Type: {data.queryType}, CID: {data.cid}) <br/>
                        <a href={data.pubChemUrl} target="_blank" rel="noopener noreferrer" title={`View full record for CID ${data.cid} on PubChem`}>
                            View full PubChem record ↗
                        </a>
                    </p>

                    {/* --- Description --- */}
                    {data.description && (
                        <div className={`${styles.infoSection} ${styles.descriptionSection}`}>
                            <h3>Description</h3>
                            <p>{data.description}</p>
                        </div>
                    )}

                     {/* --- Synonyms --- */}
                     {data.synonyms && data.synonyms.length > 0 && (
                         <div className={`${styles.infoSection} ${styles.synonymsSection}`}>
                             <h3>Common Synonyms</h3>
                             <p className={styles.synonymList}>
                                 {data.synonyms.join(', ')}
                             </p>
                         </div>
                     )}

                    {/* --- Risk Summary (More Prominent) --- */}
                    <div className={`${styles.infoSection} ${styles.riskSummary} ${getRiskClass(data.risk.riskLevel)}`}>
                        <h3 className={styles.riskHeader}>Risk Summary</h3>
                         <div className={styles.riskScoreLevelContainer}>
                             <div className={styles.riskLevelDisplay}>
                                <strong>Overall Risk Level:</strong>
                                <span className={styles.riskLevelText}>
                                    {data.risk.riskLevel}
                                </span>
                            </div>
                            <div className={styles.riskScoreDisplay}>
                                <strong>Heuristic Score:</strong>
                                <span className={styles.riskScoreValue}>
                                    {data.risk.riskLevel !== 'Unknown' ? `${data.risk.score} / 100` : 'N/A'}
                                </span>
                            </div>
                         </div>
                        <h4>Contributing Factors / Notes:</h4>
                        {data.risk.reasons.length > 0 ? (
                            <ul className={styles.riskReasonsList}>
                                {data.risk.reasons.map((reason: string, index: number) => (
                                    <li key={index}>{reason}</li>
                                ))}
                            </ul>
                        ) : (
                            <p>No specific risk factors identified or insufficient data.</p>
                        )}
                    </div>

                     {/* --- GHS Information --- */}
                     { (data.ghs.symbols.length > 0 || data.ghs.hazardStatements.length > 0 || data.ghs.signalWord) && (
                         <div className={`${styles.infoSection} ${styles.ghsSection}`}>
                             <h3>GHS Hazard Communication</h3>
                             {data.ghs.symbols.length > 0 && (
                                 <div className={styles.pictogramContainer}>
                                     {data.ghs.symbols.map((symbol, index) => (
                                         <img
                                             key={index}
                                             src={symbol.url}
                                             alt={symbol.description || 'GHS Pictogram'}
                                             title={symbol.description || 'GHS Pictogram'}
                                             className={styles.pictogram}
                                         />
                                     ))}
                                 </div>
                             )}
                             {data.ghs.signalWord && <p><strong>Signal Word:</strong> {data.ghs.signalWord}</p>}
                              {data.ghs.hazardStatements.length > 0 && (
                                 <div>
                                     <strong>Hazard Statements:</strong>
                                     <ul className={styles.statementList}>
                                        {data.ghs.hazardStatements.map((h, i) =>
                                            <li key={i} title={getHazardStatementText(h)}>{h}</li>
                                        )}
                                     </ul>
                                 </div>
                              )}
                              {data.ghs.precautionaryStatements.length > 0 && (
                                  <div>
                                      <strong>Precautionary Statement Codes:</strong>
                                       <p className={styles.precautionaryCodes}>{data.ghs.precautionaryStatements.join(', ')}</p>
                                       <p><small>(Refer to official GHS documentation for full P-statement text)</small></p>
                                  </div>
                              )}
                         </div>
                      )}

                     {/* --- Properties --- */}
                     { (data.properties.MolecularFormula || data.properties.MolecularWeight || data.properties.InChI) && (
                         <div className={`${styles.infoSection} ${styles.propertiesSection}`}>
                             <h3>Key Properties</h3>
                             <ul className={styles.propertyList}>
                                {data.properties.MolecularFormula && <li><strong>Formula:</strong> {data.properties.MolecularFormula}</li>}
                                {data.properties.MolecularWeight && <li><strong>Molecular Wt:</strong> {data.properties.MolecularWeight} g/mol</li>}
                                {data.properties.InChI && <li><strong>InChI:</strong> <span className={styles.code} title={data.properties.InChI}>{data.properties.InChI }</span></li>}
                             </ul>
                         </div>
                     )}

                     {/* --- Toxicity Information --- */}
                     { (data.toxicity.ld50.length > 0 || data.toxicity.lc50.length > 0 || data.toxicity.humanEffects.length > 0 || data.toxicity.animalEffects.length > 0) && (
                        <div className={`${styles.infoSection} ${styles.toxicitySection}`}>
                            <h3>Toxicity Information (Excerpts)</h3>
                             {data.toxicity.ld50.length > 0 && (
                                <div>
                                    <strong>LD50 Data:</strong>
                                    <ul className={styles.excerptList}>{data.toxicity.ld50.map((t, i) => <li key={`ld50-${i}`}>{t}</li>)}</ul>
                                </div>
                            )}
                             {data.toxicity.lc50.length > 0 && (
                                <div>
                                    <strong>LC50 Data:</strong>
                                     <ul className={styles.excerptList}>{data.toxicity.lc50.map((t, i) => <li key={`lc50-${i}`}>{t}</li>)}</ul>
                                </div>
                             )}
                              {data.toxicity.humanEffects.length > 0 && (
                                <div>
                                    <strong>Human Effects Excerpts:</strong>
                                    <ul className={styles.excerptList}>{data.toxicity.humanEffects.map((t, i) => <li key={`human-${i}`}>{t}</li>)}</ul>
                                </div>
                             )}
                             {data.toxicity.animalEffects.length > 0 && (
                                <div>
                                    <strong>Animal Effects Excerpts:</strong>
                                     <ul className={styles.excerptList}>{data.toxicity.animalEffects.map((t, i) => <li key={`animal-${i}`}>{t}</li>)}</ul>
                                </div>
                             )}
                              <p className={styles.disclaimerText}><small>⚠️ Note: Toxicity data shown are raw excerpts. Units, species, routes of exposure, and context vary significantly. Always refer to the full PubChem record and cited sources for reliable interpretation.</small></p>
                        </div>
                     )}

                     {/* --- Environmental Information --- */}
                     { (data.environmental.aquaticToxicity.length > 0 || data.environmental.biodegradability.length > 0 || data.environmental.bioaccumulation.length > 0) && (
                         <div className={`${styles.infoSection} ${styles.environmentalSection}`}>
                             <h3>Environmental Fate & Ecotoxicity (Excerpts)</h3>
                             {data.environmental.aquaticToxicity.length > 0 && (
                                 <div>
                                     <strong>Aquatic Toxicity Data:</strong>
                                     <ul className={styles.excerptList}>{data.environmental.aquaticToxicity.map((t, i) => <li key={`aq-${i}`}>{t}</li>)}</ul>
                                 </div>
                             )}
                              {data.environmental.biodegradability.length > 0 && (
                                 <div>
                                     <strong>Persistence/Biodegradability Data:</strong>
                                     <ul className={styles.excerptList}>{data.environmental.biodegradability.map((t, i) => <li key={`bio-${i}`}>{t}</li>)}</ul>
                                 </div>
                             )}
                              {data.environmental.bioaccumulation.length > 0 && (
                                 <div>
                                     <strong>Bioaccumulation Data:</strong>
                                     <ul className={styles.excerptList}>{data.environmental.bioaccumulation.map((t, i) => <li key={`acc-${i}`}>{t}</li>)}</ul>
                                 </div>
                             )}
                             <p className={styles.disclaimerText}><small>⚠️ Note: Environmental data shown are raw excerpts and require expert interpretation regarding test conditions and endpoints. Refer to the full PubChem record for context.</small></p>
                         </div>
                     )}

                     {data.risk.riskLevel !== 'Unknown' && !data.ghs.hazardStatements.length && !data.toxicity.ld50.length && !data.toxicity.lc50.length && !data.environmental.aquaticToxicity.length && !data.environmental.biodegradability.some(b => b.toLowerCase().includes("persist")) && !data.environmental.bioaccumulation.length && (
                        <p className={`${styles.message} ${styles.warningText}`}>Limited specific hazard data found in structured fields. Risk assessment primarily based on available properties or lack of negative indicators.</p>
                     )}
                     {data.risk.riskLevel === 'Unknown' && (
                         <p className={`${styles.message} ${styles.warningText}`}>Could not retrieve sufficient specific hazard information (GHS, Toxicity, Environmental flags) from PubChem to perform a meaningful risk assessment.</p>
                     )}

                </div>
            )}
        </div>
    );
};

export default EnvironmentalRisk;