// components/Header.js
import React from "react";

export default function Header({ kpi }) {
  return (
    <div style={{ padding: "20px 40px", background: "#f5f5f5" }}>
      <h1>Активность беспилотных воздушных судов в РФ за 2023 год</h1>
      <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
        {kpi.map((item) => (
          <div
            key={item.label}
            style={{
              flex: 1,
              padding: "20px",
              borderRadius: "8px",
              background: "white",
              boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#ff5233" }}>{item.value}</div>
            <div style={{ fontSize: "14px", color: "#555" }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
