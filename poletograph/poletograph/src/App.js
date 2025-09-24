import React, { useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { CSVLink } from "react-csv";
import * as XLSX from "xlsx";
import { Bar, Line, Pie } from "react-chartjs-2";
import russiaGeoJson from "./data/russia.json";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend
);

// глобально отключаем скрытие элементов по клику
ChartJS.defaults.plugins.legend.onClick = () => null;

// названия регионов
const regionNamesRU = {
  RUAD: "Адыгея",
  RUAL: "Горно-Алтай",
  RUALT: "Алтай",
  RUAMU: "Амурская область",
  RUARK: "Архангельская область",
  RUAST: "Астраханская область",
  RUBA: "Башкортостан",
  RUBEL: "Белгородская область",
  RUBRY: "Брянская область",
  RUBU: "Бурятия",
  RUCE: "Чечня",
  RUCHE: "Челябинская область",
  RUCHU: "Чукотский АО",
  RUCU: "Чувашия",
  RUDA: "Дагестан",
  RUIN: "Ингушетия",
  RUIRK: "Иркутская область",
  RUIVA: "Ивановская область",
  RUKAM: "Камчатка",
  RUKB: "Кабардино-Балкария",
  RUKC: "Карачаево-Черкесия",
  RUKDA: "Краснодарский край",
  RUKEM: "Кемеровская область",
  RUKGD: "Калининградская область",
  RUKGN: "Курганская область",
  RUKHA: "Хабаровский край",
  RUKHM: "Ханты-Мансийский АО",
  RUKIR: "Кировская область",
  RUKK: "Хакасия",
  RUKL: "Калмыкия",
  RUKLU: "Калужская область",
  RUKO: "Коми",
  RUKOS: "Костромская область",
  RUKR: "Карелия",
  RUKRS: "Курская область",
  RUKYA: "Красноярский край",
  RULEN: "Ленинградская область",
  RULIP: "Липецкая область",
  RUMAG: "Мага Бурятии",
  RUME: "Марий Эл",
  RUMO: "Мордовия",
  RUMOS: "Москва",
  RUMOW: "Московская область",
  RUMUR: "Мурманская область",
  RUNEN: "Ненецкий АО",
  RUNGR: "Новгородская область",
  RUNIZ: "Нижегородская область",
  RUNVS: "Новосибирская область",
  RUOMS: "Омская область",
  RUORE: "Оренбургская область",
  RUORL: "Орловская область",
  RUPER: "Пермский край",
  RUPNZ: "Пензенская область",
  RUPRI: "Приморский край",
  RUPSK: "Псковская область",
  RUROS: "Ростовская область",
  RURYA: "Рязанская область",
  RUSA: "Якутия",
  RUSAK: "Сахалинская область",
  RUSAM: "Самарская область",
  RUSAR: "Саратовская область",
  RUSE: "Северная Осетия",
  RUSMO: "Смоленская область",
  RUSPE: "Санкт-Петербург",
  RUSTA: "Ставропольский край",
  RUSVE: "Свердловская область",
  RUTA: "Татарстан",
  RUTAM: "Тамбовская область",
  RUTOM: "Томская область",
  RUTUL: "Тульская область",
  RUTVE: "Тверская область",
  RUTY: "Тува",
  RUTYU: "Тюменская область",
  RUUD: "Удмуртия",
  RUULY: "Ульяновская область",
  RUVGG: "Волгоградская область",
  RUVLA: "Владимирская область",
  RUVLG: "Вологодская область",
  RUVOR: "Воронежская область",
  RUYAN: "Ямало-Ненецкий АО",
  RUYAR: "Ярославская область",
  RUYEV: "Еврейская АО",
  RUZAB: "Чита",
};

function App() {
  const geographies = russiaGeoJson.features;

  // генерируем случайные данные
  const [droneData] = useState(
    geographies.reduce((acc, geo) => {
      acc[geo.properties.id] = {
        flights: Math.floor(Math.random() * 50),
        totalTime: Math.floor(Math.random() * 200),
      };
      acc[geo.properties.id].avgTime = acc[geo.properties.id].flights
        ? (acc[geo.properties.id].totalTime / acc[geo.properties.id].flights).toFixed(2)
        : 0;
      return acc;
    }, {})
  );

  const dataArray = Object.entries(droneData).map(([id, d]) => ({
    id,
    region: regionNamesRU[id] || id,
    flights: d.flights,
    totalTime: d.totalTime,
    avgTime: d.avgTime,
  }));

  // KPI
  const kpi = [
    { label: "Общее количество полетов", value: dataArray.reduce((s, d) => s + d.flights, 0) },
    { label: "Общее время налета, ч", value: dataArray.reduce((s, d) => s + d.totalTime, 0) },
    {
      label: "Среднее время полета, ч",
      value: (dataArray.reduce((s, d) => s + d.totalTime, 0) / dataArray.reduce((s, d) => s + d.flights, 1)).toFixed(2),
    },
    { label: "Активные регионы", value: dataArray.filter((d) => d.flights > 0).length },
  ];

  // цветовая шкала
  const maxValue = Math.max(...dataArray.map((d) => d.flights));
  const colorScale = scaleLinear().domain([0, maxValue]).range(["#ffedea", "#ff5233"]);

  // топ-10 регионов
  const topRegions = [...dataArray].sort((a, b) => b.flights - a.flights).slice(0, 10);

  const barData = {
    labels: topRegions.map((d) => d.region),
    datasets: [
      {
        label: "Полеты",
        data: topRegions.map((d) => d.flights),
        backgroundColor: "#ff5233",
      },
    ],
  };

  const lineData = {
    labels: Array.from({ length: 12 }, (_, i) => `${i + 1} мес`),
    datasets: [
      {
        label: "Активность по месяцам",
        data: Array.from({ length: 12 }, () => Math.floor(Math.random() * 100)),
        borderColor: "#0071BC",
        fill: false,
      },
    ],
  };

  const pieData = {
    labels: ["ЦФО", "СФО", "ДФО", "ЮФО", "СКФО", "ПФО", "УФО", "СЗФО"],
    datasets: [
      {
        data: Array.from({ length: 8 }, () => Math.floor(Math.random() * 100)),
        backgroundColor: ["#29ABE2", "#1B1464", "#0071BC", "#FF5233", "#28a745", "#ffc107", "#6f42c1", "#20c997"],
      },
    ],
  };

  // экспорт Excel
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(dataArray);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Details");
    XLSX.writeFile(wb, "details.xlsx");
  };

  return (
    <div style={{ padding: "20px 40px", background: "#f9fafc", fontFamily: "Montserrat, sans-serif" }}>
      {/* Шапка */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, rgb(41,171,226), rgb(27,20,100))",
          color: "white",
          padding: "25px 40px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          marginBottom: "30px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: "26px", fontWeight: "700" }}>
          <img src="/logo.png" alt="Полетограф" style={{ height: "100px", marginRight: "12px" }} />
        </div>
        <div style={{ fontSize: "18px", maxWidth: "400px", textAlign: "right" }}>
          Сервис визуализации активности БПЛА по регионам России
        </div>
      </header>

      {/* Заголовок */}
      <h1
        style={{
          textAlign: "center",
          marginBottom: "30px",
          fontSize: "28px",
          fontWeight: "700",
          color: "#0071BC",
        }}
      >
        Активность беспилотных воздушных судов в РФ за 2025 год
      </h1>

      {/* KPI */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "30px", flexWrap: "wrap" }}>
        {kpi.map((item) => (
          <div
            key={item.label}
            style={{
              flex: "1 1 200px",
              padding: "20px",
              borderRadius: "12px",
              background: "linear-gradient(135deg,#fff,#f5f5f5)",
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              textAlign: "center",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-5px)";
              e.currentTarget.style.boxShadow = "0 6px 14px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.1)";
            }}
          >
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#FF5233" }}>{item.value}</div>
            <div style={{ fontSize: "14px", color: "#555" }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Кнопка CSV */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
        <CSVLink data={dataArray} filename="map_data.csv">
          <button style={{ padding: "10px 15px", borderRadius: "6px", background: "#0071BC", color: "white" }}>
            Скачать данные (CSV)
          </button>
        </CSVLink>
      </div>

      {/* Карта */}
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 300, center: [100, 70] }}
        width={1000}
        height={600}
      >
        <Geographies geography={russiaGeoJson}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const id = geo.properties.id;
              const value = droneData[id]?.flights || 0;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={colorScale(value)}
                  stroke="#FFF"
                  strokeWidth={0.5}
                  data-tooltip-id="map-tooltip"
                  data-tooltip-content={`${regionNamesRU[id] || id}: ${value} БПЛА`}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", opacity: 0.8 },
                    pressed: { outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
      <Tooltip id="map-tooltip" />

      {/* Графики */}
      <div
        style={{
          marginTop: "40px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(550px, 2fr))",
          gap: "100px",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ marginBottom: "15px", color: "#0071BC", textAlign: "center" }}>Топ-10 регионов по полётам</h3>
          <Bar data={barData} height={200} />
        </div>

        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ marginBottom: "15px", color: "#0071BC", textAlign: "center" }}>Активность по месяцам</h3>
          <Line data={lineData} height={200} />
        </div>

        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ marginBottom: "15px", color: "#0071BC", textAlign: "center" }}>Распределение по округам</h3>
          <Pie data={pieData} height={200} />
        </div>

        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ marginBottom: "15px", color: "#0071BC", textAlign: "center" }}>
            Топ-10 регионов по общему времени
          </h3>
          <Bar
            data={{
              labels: [...dataArray]
                .sort((a, b) => b.totalTime - a.totalTime)
                .slice(0, 10)
                .map((d) => d.region),
              datasets: [
                {
                  label: "Общее время (ч)",
                  data: [...dataArray]
                    .sort((a, b) => b.totalTime - a.totalTime)
                    .slice(0, 10)
                    .map((d) => d.totalTime),
                  backgroundColor: "#28a745",
                },
              ],
            }}
            height={200}
          />
        </div>
      </div>

      {/* Таблица */}
      <div
        style={{
          marginTop: "40px",
          background: "white",
          padding: "20px",
          borderRadius: "12px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
        }}
      >
        <h2 style={{ color: "#0071BC" }}>Детализация по регионам</h2>
        <button
          onClick={exportExcel}
          style={{
            marginBottom: "10px",
            padding: "8px 12px",
            borderRadius: "6px",
            background: "#0071BC",
            color: "white",
          }}
        >
          Скачать как Excel
        </button>
        <table style={{ width: "100%", marginTop: "10px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={{ padding: "8px", border: "1px solid #ddd" }}>Регион</th>
              <th style={{ padding: "8px", border: "1px solid #ddd" }}>Полеты</th>
              <th style={{ padding: "8px", border: "1px solid #ddd" }}>Общее время</th>
              <th style={{ padding: "8px", border: "1px solid #ddd" }}>Среднее время</th>
            </tr>
          </thead>
          <tbody>
            {dataArray.map((d) => (
              <tr key={d.id}>
                <td style={{ padding: "8px", border: "1px solid #ddd" }}>{d.region}</td>
                <td style={{ padding: "8px", border: "1px solid #ddd" }}>{d.flights}</td>
                <td style={{ padding: "8px", border: "1px solid #ddd" }}>{d.totalTime}</td>
                <td style={{ padding: "8px", border: "1px solid #ddd" }}>{d.avgTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
