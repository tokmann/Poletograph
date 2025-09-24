import React from "react";
import Header from "./Header";
import MapSection from "./MapSection";
import TopRegionsChart from "./TopRegionsChart";
import DetailsTable from "./DetailsTable";

export default function DashboardLayout({ kpi, mapData, topData, tableData }) {
  return (
    <div>
      <Header kpi={kpi} />
      <MapSection data={mapData} />
      <TopRegionsChart data={topData} />
      <DetailsTable data={tableData} />
    </div>
  );
}
