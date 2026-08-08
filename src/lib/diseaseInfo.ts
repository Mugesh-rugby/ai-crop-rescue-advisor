// src/lib/diseaseInfo.ts
//
// This is curated agronomic REFERENCE content (general, widely-published
// plant pathology guidance), not model output. It is keyed to the same
// class names the classifier predicts, but the treatment text itself never
// changes based on "confidence" — the model only decides WHICH entry to
// show, this file supplies WHAT it says.
//
// IMPORTANT: before real farmers rely on this, have a licensed agronomist /
// local agricultural extension office review and localize it (dosages,
// product names, and regulations vary a lot by country and region).

export interface DiseaseInfo {
  description: string;
  symptoms: string[];
  causes: string[];
  organicTreatment: string[];
  chemicalTreatment: string[];
  prevention: string[];
  recoveryTimeDays: [number, number]; // rough range, not a guarantee
}

export const diseaseInfo: Record<string, DiseaseInfo> = {
  Tomato___Early_blight: {
    description:
      "A fungal disease (Alternaria solani) that produces target-like concentric rings on older leaves first.",
    symptoms: ["Dark brown spots with concentric rings", "Yellowing around lesions", "Lower leaves affected first"],
    causes: ["Warm, humid conditions", "Overhead watering", "Plant stress / poor nutrition"],
    organicTreatment: ["Copper-based fungicide spray", "Remove and destroy infected leaves", "Neem oil application every 7 days"],
    chemicalTreatment: ["Chlorothalonil-based fungicide", "Mancozeb spray per label rate"],
    prevention: ["Crop rotation (avoid nightshades for 2 years)", "Drip irrigation instead of overhead", "Adequate plant spacing for airflow"],
    recoveryTimeDays: [10, 21],
  },
  Tomato___Late_blight: {
    description:
      "A fast-spreading water mold disease (Phytophthora infestans) — the same pathogen behind the Irish potato famine.",
    symptoms: ["Water-soaked gray-green patches", "White fungal growth on leaf undersides in humid weather", "Rapid collapse of foliage"],
    causes: ["Cool, wet weather", "Poor air circulation", "Infected seed or nearby volunteer plants"],
    organicTreatment: ["Copper fungicide (preventive, before rain events)", "Remove infected plants entirely to stop spread"],
    chemicalTreatment: ["Chlorothalonil or mancozeb-based fungicide, applied preventively"],
    prevention: ["Plant resistant varieties", "Avoid overhead irrigation", "Destroy volunteer potato/tomato plants nearby"],
    recoveryTimeDays: [14, 30],
  },
  Potato___Late_blight: {
    description: "Same pathogen as tomato late blight (Phytophthora infestans); highly destructive in cool, wet weather.",
    symptoms: ["Dark lesions on leaves and stems", "White mold ring on leaf undersides", "Tuber rot in storage"],
    causes: ["Cool wet conditions (15-20°C, high humidity)", "Infected seed potatoes"],
    organicTreatment: ["Copper-based fungicide before forecasted rain", "Destroy infected foliage"],
    chemicalTreatment: ["Mancozeb or chlorothalonil fungicide on a preventive schedule"],
    prevention: ["Use certified disease-free seed potatoes", "Hill soil over tubers", "Avoid working fields when foliage is wet"],
    recoveryTimeDays: [14, 28],
  },
  Corn___Common_rust: {
    description: "A fungal disease (Puccinia sorghi) producing rust-colored pustules on leaves.",
    symptoms: ["Reddish-brown raised pustules on both leaf surfaces", "Pustules turn dark brown/black late season"],
    causes: ["Cool, humid weather", "Wind-dispersed spores"],
    organicTreatment: ["Sulfur-based fungicide at first sign"],
    chemicalTreatment: ["Triazole or strobilurin fungicide per label"],
    prevention: ["Plant rust-resistant hybrids", "Avoid excessive nitrogen", "Monitor fields weekly during humid periods"],
    recoveryTimeDays: [10, 20],
  },
  Apple___Apple_scab: {
    description: "A fungal disease (Venturia inaequalis) causing olive-green to black scabby lesions on leaves and fruit.",
    symptoms: ["Olive-green velvety spots on leaves", "Corky, scabby lesions on fruit", "Premature leaf drop"],
    causes: ["Wet spring weather", "Overwintering spores in fallen leaves"],
    organicTreatment: ["Sulfur or lime-sulfur spray from bud break", "Rake and destroy fallen leaves in autumn"],
    chemicalTreatment: ["Myclobutanil or captan fungicide per label schedule"],
    prevention: ["Plant scab-resistant varieties", "Prune for airflow", "Sanitize orchard floor each fall"],
    recoveryTimeDays: [21, 45],
  },
  Grape___Black_rot: {
    description: "A fungal disease (Guignardia bidwellii) causing circular brown lesions on leaves and rotting fruit.",
    symptoms: ["Reddish-brown circular leaf spots", "Fruit shrivels into hard black mummies"],
    causes: ["Warm, wet weather in spring", "Overwintering mummified fruit and cane lesions"],
    organicTreatment: ["Remove and destroy mummified fruit and infected canes", "Sulfur-based fungicide"],
    chemicalTreatment: ["Myclobutanil fungicide from early shoot growth through veraison"],
    prevention: ["Prune for canopy airflow", "Remove mummies before bud break", "Resistant rootstock/varieties where available"],
    recoveryTimeDays: [21, 40],
  },
};

export function getDiseaseInfo(className: string): DiseaseInfo | null {
  return diseaseInfo[className] ?? null;
}

export function isKnownHealthyClass(className: string) {
  return className.toLowerCase().endsWith("healthy");
}
