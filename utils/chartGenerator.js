const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

// Chart configuration
const width = 800;
const height = 500;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ 
  width, 
  height,
  backgroundColour: 'white'
});

/**
 * Generate a bar chart for incidents by barangay
 * @param {Array} barangayData - Array of {barangay, incident_count}
 * @returns {Promise<string>} Base64 encoded PNG image
 */
async function generateBarangayBarChart(barangayData) {
  if (!barangayData || barangayData.length === 0) {
    return null;
  }

  // Sort by incident count and take top 10
  const sortedData = [...barangayData]
    .sort((a, b) => b.incident_count - a.incident_count)
    .slice(0, 10);

  const labels = sortedData.map(d => d.barangay);
  const data = sortedData.map(d => d.incident_count);

  const configuration = {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Number of Incidents',
        data: data,
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Fire Incidents by Barangay',
          font: {
            size: 18,
            weight: 'bold'
          },
          color: '#000000'
        },
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            color: '#000000'
          },
          title: {
            display: true,
            text: 'Number of Incidents',
            color: '#000000'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Barangay',
            color: '#000000'
          },
          ticks: {
            autoSkip: false,
            maxRotation: 45,
            minRotation: 45,
            color: '#000000'
          }
        }
      }
    },
    plugins: [{
      id: 'background',
      beforeDraw: (chart) => {
        const ctx = chart.ctx;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, chart.width, chart.height);
      }
    }]
  };

  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  return `data:image/png;base64,${imageBuffer.toString('base64')}`;
}

/**
 * Generate a pie chart for alarm level distribution
 * @param {Array} incidents - Array of incidents with alarm_level
 * @returns {Promise<string>} Base64 encoded PNG image
 */
async function generateAlarmLevelPieChart(incidents) {
  if (!incidents || incidents.length === 0) {
    return null;
  }

  // Count alarm levels
  const alarmCounts = {};
  incidents.forEach(incident => {
    const alarm = incident.alarm_level || 'Unknown';
    alarmCounts[alarm] = (alarmCounts[alarm] || 0) + 1;
  });

  const labels = Object.keys(alarmCounts);
  const data = Object.values(alarmCounts);
  
  // Colors for different alarm levels
  const colors = [
    'rgba(255, 206, 86, 0.8)',  // Yellow
    'rgba(255, 159, 64, 0.8)',  // Orange
    'rgba(255, 99, 132, 0.8)',  // Red
    'rgba(153, 102, 255, 0.8)', // Purple
    'rgba(54, 162, 235, 0.8)',  // Blue
    'rgba(75, 192, 192, 0.8)',  // Teal
    'rgba(201, 203, 207, 0.8)'  // Grey
  ];

  const configuration = {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: 'white',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Incidents by Alarm Level',
          font: {
            size: 18,
            weight: 'bold'
          },
          color: '#000000'
        },
        legend: {
          position: 'right',
          labels: {
            font: {
              size: 12
            },
            color: '#000000',
            padding: 10,
            generateLabels: (chart) => {
              const data = chart.data;
              if (data.labels.length && data.datasets.length) {
                return data.labels.map((label, i) => {
                  const value = data.datasets[0].data[i];
                  const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return {
                    text: `${label}: ${value} (${percentage}%)`,
                    fillStyle: data.datasets[0].backgroundColor[i],
                    fontColor: '#000000',
                    hidden: false,
                    index: i
                  };
                });
              }
              return [];
            }
          }
        }
      }
    },
    plugins: [{
      id: 'background',
      beforeDraw: (chart) => {
        const ctx = chart.ctx;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, chart.width, chart.height);
      }
    }]
  };

  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  return `data:image/png;base64,${imageBuffer.toString('base64')}`;
}

/**
 * Generate a pie chart for fire causes
 * @param {Array} causes - Array of {cause, case_count, percentage}
 * @returns {Promise<string>} Base64 encoded PNG image
 */
async function generateCausesPieChart(causes) {
  if (!causes || causes.length === 0) {
    return null;
  }

  const labels = causes.map(c => c.cause);
  const data = causes.map(c => c.case_count);
  
  // Colors for different causes
  const colors = [
    'rgba(255, 99, 132, 0.8)',  // Red
    'rgba(54, 162, 235, 0.8)',  // Blue
    'rgba(255, 206, 86, 0.8)',  // Yellow
    'rgba(75, 192, 192, 0.8)',  // Teal
    'rgba(153, 102, 255, 0.8)', // Purple
    'rgba(255, 159, 64, 0.8)',  // Orange
    'rgba(201, 203, 207, 0.8)'  // Grey
  ];

  const configuration = {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: 'white',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Fire Incidents by Cause/Category',
          font: {
            size: 18,
            weight: 'bold'
          },
          color: '#000000'
        },
        legend: {
          position: 'right',
          labels: {
            font: {
              size: 12
            },
            color: '#000000',
            padding: 10,
            generateLabels: (chart) => {
              const data = chart.data;
              if (data.labels.length && data.datasets.length) {
                return data.labels.map((label, i) => {
                  const value = data.datasets[0].data[i];
                  const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return {
                    text: `${label}: ${value} (${percentage}%)`,
                    fillStyle: data.datasets[0].backgroundColor[i],
                    fontColor: '#000000',
                    hidden: false,
                    index: i
                  };
                });
              }
              return [];
            }
          }
        }
      }
    },
    plugins: [{
      id: 'background',
      beforeDraw: (chart) => {
        const ctx = chart.ctx;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, chart.width, chart.height);
      }
    }]
  };

  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  return `data:image/png;base64,${imageBuffer.toString('base64')}`;
}

module.exports = {
  generateBarangayBarChart,
  generateAlarmLevelPieChart,
  generateCausesPieChart
};
