 // routes/incidentsHistory.js
const express = require('express');
const router = express.Router();

// Placeholder data for historical fire incidents
const dummyHistory = [
  {
    id: 101,
    barangay: 'Barangka Ibaba',
    year: 2021,
    description: 'Residential fire',
    geometry: {
      type: 'Point',
      coordinates: [121.0443, 14.5812],
    },
  },
  {
    id: 102,
    barangay: 'Hulo',
    year: 2022,
    description: 'Electrical fire in factory',
    geometry: {
      type: 'Point',
      coordinates: [121.0355, 14.5773],
    },
  },
  {
    id: 103,
    barangay: 'Plainview',
    year: 2023,
    description: 'Commercial fire in mall',
    geometry: {
      type: 'Point',
      coordinates: [121.0431, 14.5857],
    },
  },
];

router.get('/', (req, res) => {
  const features = dummyHistory.map((incident) => ({
    type: 'Feature',
    geometry: incident.geometry,
    properties: {
      id: incident.id,
      barangay: incident.barangay,
      year: incident.year,
      description: incident.description,
    },
  }));

  const geojson = {
    type: 'FeatureCollection',
    features,
  };

  res.json(geojson);
});

module.exports = router;
