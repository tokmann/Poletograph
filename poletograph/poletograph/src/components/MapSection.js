// components/MapSection.js
import React, { useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import russiaGeoJson from "../data/regions.json";
import { saveAs } from "file-saver";
import { CSVLink } from "react-csv";

export default function MapSection({ data }) {
  const [metric, setMetric] = useState("flights");

  const metricsOptions = {
    flights: "Количество полетов",
    totalTime: "Общее время налета",
    avgTime: "Среднее время полета",
  };

  const colorScale = scaleLinear()
    .domain([0, Math.max(...data.map((d) => d[metric]))])
    .range(["#d4f0ff", "#004c8c"]);

  const handleDownloadCSV = () => {
    const csvData = data.map((d) => ({
      region: d.region,
      flights: d.flights,
      totalTime: d.totalTime,
      avgTime: d.avgTime,
    }));
    saveAs(new Blob([JSON.stringify(csvData)], { type: "application/json" }), "map_data.json");
  };

  return (
    <div style={{ padding: "20px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
        <div>
          <label>Метрика: </label>
          <select value={metric} onChange={(e) => setMetric(e.target.value)}>
            {Object.entries(metricsOptions).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <button onClick={handleDownloadCSV}>📥 Скачать данные по регионам (CSV)</button>
        </div>
      </div>

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 800, center: [105, 60] }}
        width={1200}
        height={400}
      >
        <Geographies geography={russiaGeoJson}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const regionData = data.find((d) => d.id === geo.properties.id) || { [metric]: 0 };
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={colorScale(regionData[metric])}
                  stroke="#FFF"
                  strokeWidth={0.5}
                  data-tooltip-id="tooltip"
                  data-tooltip-content={`${geo.properties.name}: ${regionData[metric]}`}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
      <Tooltip id="tooltip" />
    </div>
  );
}
