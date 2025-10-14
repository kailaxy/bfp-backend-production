# Model configuration extracted from Colab SARIMAX results
# This maps each barangay to its best SARIMAX order
# Format: (p,d,q) + (P,D,Q,s)

BARANGAY_MODELS = {
    "Addition Hills": {"order": (2,0,1), "seasonal": (0,1,1,12)},
    "Bagong Silang": {"order": (2,0,1), "seasonal": (0,1,1,12)},
    "Barangka Drive": {"order": (1,1,1), "seasonal": (1,0,1,12)},
    "Barangka Ibaba": {"order": (1,1,1), "seasonal": (1,0,1,12)},
    "Barangka Ilaya": {"order": (2,0,1), "seasonal": (0,1,1,12)},
    "Barangka Itaas": {"order": (1,1,1), "seasonal": (1,0,1,12)},
    "Buayang Bato": {"order": (1,1,1), "seasonal": (1,0,1,12)},
    "Burol": {"order": (1,0,1), "seasonal": (1,0,1,12)},
    "Daang Bakal": {"order": (1,0,1), "seasonal": (1,0,1,12)},
    "Hagdang Bato Itaas": {"order": (1,0,1), "seasonal": (1,0,1,12)},
    "Hagdang Bato Libis": {"order": (1,1,1), "seasonal": (1,0,1,12)},
    "Harapin ang Bukas": {"order": (1,1,1), "seasonal": (1,0,1,12)},
    "Highway Hills": {"order": (1,1,1), "seasonal": (1,0,1,12)},
    "Hulo": {"order": (1,1,1), "seasonal": (1,0,1,12)},
    "Mabini J. Rizal": {"order": (1,1,1), "seasonal": (1,0,1,12)},
    "Malamig": {"order": (1,1,1), "seasonal": (1,0,1,12)},
    "Mauway": {"order": (1,1,1), "seasonal": (1,0,1,12)},
    "Namayan": {"order": (1,1,1), "seasonal": (1,0,1,12)},
    "New Zañiga": {"order": (1,1,1), "seasonal": (1,0,1,12)},
    "Old Zañiga": {"order": (1,1,1), "seasonal": (1,0,1,12)},
    "Pag-asa": {"order": (1,0,1), "seasonal": (1,0,1,12)},
    "Plainview": {"order": (2,0,1), "seasonal": (0,1,1,12)},
    "Pleasant Hills": {"order": (1,0,1), "seasonal": (1,0,1,12)},
    "Poblacion": {"order": (1,1,1), "seasonal": (1,0,1,12)},
    "San Jose": {"order": (1,1,1), "seasonal": (1,0,1,12)},
    "Vergara": {"order": (2,0,1), "seasonal": (0,1,1,12)},
    "Wack-Wack Greenhills": {"order": (2,0,1), "seasonal": (0,1,1,12)},
}

# Normalization variants for name matching
BARANGAY_NAME_ALIASES = {
    "Hagdang Bato Itaas": ["Hagdan Bato Itaas"],
    "Hagdang Bato Libis": ["Hagdan Bato Libis"],
    "New Zañiga": ["New Zaniga"],
    "Old Zañiga": ["Old Zaniga"],
    "Wack-Wack Greenhills": ["Wack-wack Greenhills"],
}

def get_model_for_barangay(barangay_name):
    """
    Get the SARIMAX model configuration for a barangay
    Returns: dict with 'order' and 'seasonal' keys, or None if not found
    """
    # Try exact match first
    if barangay_name in BARANGAY_MODELS:
        return BARANGAY_MODELS[barangay_name]
    
    # Try aliases
    for canonical_name, aliases in BARANGAY_NAME_ALIASES.items():
        if barangay_name in aliases or barangay_name == canonical_name:
            return BARANGAY_MODELS.get(canonical_name)
    
    # Try case-insensitive match
    normalized = barangay_name.lower()
    for key in BARANGAY_MODELS.keys():
        if key.lower() == normalized:
            return BARANGAY_MODELS[key]
    
    # Default fallback
    return {"order": (1,1,1), "seasonal": (1,0,1,12)}
