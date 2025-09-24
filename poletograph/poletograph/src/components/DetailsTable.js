// components/DetailsTable.js
import React from "react";
import * as XLSX from "xlsx";

export default function DetailsTable({ data }) {
  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Details");
    XLSX.writeFile(wb, "details.xlsx");
  };

  return (
    <div style={{ padding: "20px 40px" }}>
      <h2>Детализация по регионам</h2>
      <button onClick={handleExport}>📥 Скачать как Excel</button>
      <table style={{ width: "100%", marginTop: "10px", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Регион</th>
            <th>Полеты</th>
            <th>Общее время</th>
            <th>Среднее время</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.id}>
              <td>{d.region}</td>
              <td>{d.flights}</td>
              <td>{d.totalTime}</td>
              <td>{d.avgTime}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
