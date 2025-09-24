// components/TopRegionsChart.js
import React, { useState } from "react";
import { Bar, Line, Pie } from "react-chartjs-2";
import { CSVLink } from "react-csv";

export default function TopRegionsChart({ data }) {
  const [chartType, setChartType] = useState("bar");

  const chartData = {
    labels: data.map((d) => d.region),
    datasets: [
      {
        label: "Количество полетов",
        data: data.map((d) => d.flights),
        backgroundColor: "#ff5233",
        borderColor: "#ff5233",
      },
    ],
  };

  const renderChart = () => {
    switch (chartType) {
      case "bar":
        return <Bar data={chartData} />;
      case "line":
        return <Line data={chartData} />;
      case "pie":
        return <Pie data={chartData} />;
      default:
        return <Bar data={chartData} />;
    }
  };

  return (
    <div style={{ padding: "20px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Топ-10 регионов</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setChartType("bar")}>📊</button>
          <button onClick={() => setChartType("line")}>📈</button>
          <button onClick={() => setChartType("pie")}>🥧</button>
          <CSVLink data={data} filename="top_regions.csv">
            📥
          </CSVLink>
        </div>
      </div>
      {renderChart()}
    </div>
  );
}
