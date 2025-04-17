# ChemLens – Environmental & Safety Risk Assessor 🧪



A web application built with Next.js that allows users to quickly assess the potential environmental and human safety risks of chemical compounds by leveraging the PubChem PUG REST and PUG View APIs. Enter a chemical name, CID, formula, or InChI string to get started.

**Submission for the StackUp April 2025 Coding Challenge (Chemistry Theme).**

## Demo

 
- [Watch/Download the demo (GitHub)](./Demo.mp4)  
- [Watch the demo (YouTube)](https://youtu.be/VQ-gMq-O6QE)
<!-- *   **(Optional) Live Application:** **[Link to Your Deployed App (Optional)]** *(Replace if you deploy it)* -->


## About The Project 

Navigating the safety and environmental impact data for chemical compounds can be time-consuming, often requiring digging through dense reports or complex databases. ChemLens aims to simplify this initial assessment process.

Built for students, researchers, lab technicians, or anyone needing a rapid overview of a chemical's potential hazards, ChemLens provides a user-friendly interface to query the vast PubChem database. By entering a common identifier, the application fetches, processes, and presents key information in a structured and easy-to-understand format.

This includes:

*   **GHS Information:** Pictograms, signal words, and hazard statements defined by the Globally Harmonized System.
*   **Toxicity Data:** Excerpts of LD50/LC50 values and human/animal effects (where available).
*   **Environmental Fate:** Information related to aquatic toxicity, biodegradability, and bioaccumulation potential.
*   **Heuristic Risk Score:** A calculated score (0-100) and corresponding level (Low, Medium, High, Unknown) based on the presence and severity of GHS hazards, toxicity data, and indicators of persistence or bioaccumulation. This score serves as an **initial screening indicator**, not a definitive assessment.
*   **Key Properties & Synonyms:** Basic chemical properties and common names for easy identification.

ChemLens utilizes PubChem's public APIs, demonstrating how powerful open data sources can be leveraged to create impactful tools in the life sciences and chemistry domains. It streamlines the process of gathering critical safety information, promoting awareness and safer handling practices.

### Built With

*   [Next.js](https://nextjs.org/) (React Framework)
*   [React](https://reactjs.org/)
*   [TypeScript](https://www.typescriptlang.org/)
*   [PubChem PUG REST API](https://pubchemdocs.ncbi.nlm.nih.gov/pug-rest)
*   [PubChem PUG View API](https://pubchemdocs.ncbi.nlm.nih.gov/pug-view)
*   CSS Modules

## Key Features

*    Accepts various chemical identifiers: Name, PubChem CID, Formula, InChI.
*    Fetches comprehensive data directly from PubChem.
*    Extracts and displays GHS information (Pictograms, Signal Word, H/P Statements).
*    Shows summarized excerpts of Toxicity and Environmental data.
*    Calculates a heuristic risk score (0-100) and level (Low, Medium, High, Unknown).
*    Provides clear reasons contributing to the risk assessment score.
*    Displays key chemical properties and common synonyms.
*    Links directly to the full PubChem record for deeper investigation.
*    Clean, responsive user interface.
*    Input clearing functionality for ease of use.

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

*   Node.js (v18.x or later recommended)
*   npm, yarn, or pnpm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/Im-in123/ChemLens-Risk-Assessor
    ```
2.  Navigate to the project directory:
    ```bash
    cd chemlens
    ```
3.  Install NPM packages:
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

### Running the Application

1.  Start the development server:
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```
2.  Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## How It Works

1.  **Frontend Input:** The user enters a chemical identifier into the input field (`src/components/EnvironmentalRisk.tsx`).
2.  **API Request:** On submission, the frontend makes a GET request to the Next.js API route (`src/app/api/environmental-risk/route.ts`) with the user's query.
3.  **Identifier Detection:** The API route first attempts to detect the type of input (CID, name, formula, InChI) using helper functions.
4.  **PubChem CID Lookup:** It queries the PubChem PUG REST API to find the corresponding PubChem Compound ID (CID) based on the input type. It includes fallback logic (e.g., trying name search if formula fails).
5.  **Data Fetching:**
    *   It fetches key chemical properties (MW, Formula, IUPAC Name, InChI) using the `/property/` endpoint.
    *   It fetches the full compound record using the PUG View API (`/pug_view/data/`) to access detailed sections, including GHS, toxicity, environmental fate, descriptions, and synonyms.
6.  **Data Extraction:** The complex JSON response from PUG View is parsed. Specific functions crawl through the nested `Section` structure to extract relevant data points like GHS pictograms, hazard statements (H-codes), precautionary statements (P-codes), toxicity excerpts (LD50, LC50), environmental data (aquatic toxicity, biodegradability, bioaccumulation), synonyms, and descriptions.
7.  **Risk Calculation:** A heuristic scoring algorithm (`calculateRisk` function) analyzes the extracted data:
    *   Points are assigned based on the severity and type of GHS hazard statements (health vs. environmental).
    *   Points are added for indicators like high molecular weight (especially if halogenated), evidence of persistence, bioaccumulation, or presence of toxicity data.
    *   The total score determines the risk level (Low, Medium, High). If insufficient data is found, the level is set to "Unknown".
    *   Key factors contributing to the score are collected as "reasons".
8.  **API Response:** The API route formats all gathered information (properties, GHS, toxicity, environmental, risk score/level/reasons, synonyms, description, PubChem URL) into a JSON object and sends it back to the frontend.
9.  **Frontend Display:** The `EnvironmentalRisk` component receives the data, updates its state, and renders the results dynamically, applying appropriate styling based on the risk level and data availability.

## Disclaimer

**IMPORTANT:** ChemLens is intended for informational and initial screening purposes only. The heuristic risk score is based on publicly available data from PubChem and a simplified algorithm; it is **NOT** a substitute for a formal, comprehensive risk assessment conducted by qualified professionals. Data availability and quality on PubChem can vary. Always consult official Safety Data Sheets (SDS), regulatory databases, and expert toxicological/environmental assessment for critical applications or decisions. Use this tool responsibly.

## License

Distributed under the MIT License. See `LICENSE` file for more information.

## Contact

- X Handle - **[@Rudy00243322](https://twitter.com/@Rudy00243322)**
- Discord Handle - **rudy77_**  

Project Link: **[https://github.com/Im-in123/ChemLens-Risk-Assessor](https://github.com/Im-in123/ChemLens-Risk-Assessor)** 

## Acknowledgements

*   [PubChem](https://pubchem.ncbi.nlm.nih.gov/) for providing the invaluable chemical data via their APIs.
*   [Next.js](https://nextjs.org/) Team
*   [StackUp](https://stackup.dev/) / [AngelHack](https://angelhack.com/) for hosting the hackathon.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

 
 
