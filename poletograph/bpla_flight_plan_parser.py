import re
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, List
import hashlib
import logging
import geopandas as gpd
from shapely.geometry import Point

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class BPLAFlightPlanParser:
    def __init__(self, regions_shapefile_path: str):
        self.regions_gdf = gpd.read_file(regions_shapefile_path, encoding='utf-8')
        self.regions_gdf = self.regions_gdf.to_crs(epsg=4326)
        self.validation_stats = {
            'total_records': 0,
            'valid_records': 0,
            'invalid_coordinates': 0,
            'invalid_datetime': 0,
            'duplicates_removed': 0,
            'normalized_records': 0
        }

    def normalize_plan(self, plan: Dict) -> Dict:
        self.validation_stats['normalized_records'] += 1

        if plan['aircraft_type']:
            match = re.search(r'[A-Za-z]+', plan['aircraft_type'])
            base_type = match.group(0).upper() if match else plan['aircraft_type'].upper()
        else:
            base_type = None

        aircraft_types = {
            'BLA': 'Беспилотный летательный аппарат',
            'AER': 'Пилотируемый аэростат',
            'SHAR': 'Шар-зонд'
        }

        if base_type in aircraft_types:
            plan['aircraft_type'] = aircraft_types[base_type]

        return plan

    def parse_coordinates(self, coord_str: str) -> Optional[Tuple[float, float]]:
        try:
            coord_str = coord_str.strip()
            if re.match(r'\d{6}N\d{7}E', coord_str):
                parts = coord_str.split('N')
                lat_part = parts[0]
                lon_part = parts[1].rstrip('E')
                lat_deg = int(lat_part[:2])
                lat_min = int(lat_part[2:4])
                lat_sec = int(lat_part[4:6])
                lon_deg = int(lon_part[:3])
                lon_min = int(lon_part[3:5])
                lon_sec = int(lon_part[5:7])
                lat = lat_deg + lat_min / 60 + lat_sec / 3600
                lon = lon_deg + lon_min / 60 + lon_sec / 3600
                return (lat, lon)
            elif re.match(r'\d{4}N\d{5}E', coord_str):
                parts = coord_str.split('N')
                lat_part = parts[0]
                lon_part = parts[1].rstrip('E')
                lat_deg = int(lat_part[:2])
                lat_min = int(lat_part[2:4])
                lon_deg = int(lon_part[:3])
                lon_min = int(lon_part[3:5])
                lat = lat_deg + lat_min / 60
                lon = lon_deg + lon_min / 60
                return (lat, lon)
        except Exception as e:
            logger.error(f"Ошибка при парсинге координат {coord_str}: {e}")
            self.validation_stats['invalid_coordinates'] += 1
        return None

    def validate_coordinates(self, lat: float, lon: float) -> bool:
        if not (41.0 <= lat <= 82.0 and 19.0 <= lon <= 180.0):
            return False
        return True

    def determine_region(self, lat: float, lon: float) -> str:
        point = Point(lon, lat)
        matched = self.regions_gdf[self.regions_gdf.geometry.contains(point)]
        if not matched.empty and matched.iloc[0]['name']:
            return matched.iloc[0]['name']
        else:
            return 'Неопределенный субъект РФ'

    def parse_date_time(self, date_str: str, time_str: str) -> Optional[datetime]:
        try:
            if len(date_str) == 6 and len(time_str) == 4:
                year = 2000 + int(date_str[:2])
                month = int(date_str[2:4])
                day = int(date_str[4:6])
                hour = int(time_str[:2])
                minute = int(time_str[2:4])
                if not (1 <= month <= 12 and 1 <= day <= 31 and 0 <= hour <= 23 and 0 <= minute <= 59):
                    raise ValueError("Некорректная дата/время")
                return datetime(year, month, day, hour, minute)
        except Exception as e:
            logger.error(f"Ошибка при парсинге даты/времени {date_str}/{time_str}: {e}")
            self.validation_stats['invalid_datetime'] += 1
        return None

    def parse_flight_plan(self, flight_data: str) -> Dict:
        self.validation_stats['total_records'] += 1
        result = {
            'flight_id': None,
            'sid': None,
            'aircraft_type': None,
            'departure_coords': None,
            'departure_lat': None,
            'departure_lon': None,
            'departure_datetime': None,
            'arrival_coords': None,
            'arrival_lat': None,
            'arrival_lon': None,
            'arrival_datetime': None,
            'duration_hours': None,
            'region': None,
            'altitude_min': None,
            'altitude_max': None,
        }
        try:
            sid_match = re.search(r'SID[/\s]+(\d+)', flight_data)
            if sid_match:
                result['sid'] = sid_match.group(1)

            flight_id_match = re.search(r'SHR-?(\d+)', flight_data)
            if flight_id_match:
                result['flight_id'] = flight_id_match.group(1)
            elif result['sid']:
                result['flight_id'] = result['sid']

            type_match = re.search(r'TYP/(\w+)', flight_data)
            if type_match:
                result['aircraft_type'] = type_match.group(1)

            coord_matches = re.findall(r'(\d{4,6}N\d{5,7}E)', flight_data)
            if coord_matches:
                dep_coords = self.parse_coordinates(coord_matches[0])
                if dep_coords:
                    result['departure_coords'] = coord_matches[0]
                    result['departure_lat'], result['departure_lon'] = dep_coords
                    if self.validate_coordinates(dep_coords[0], dep_coords[1]):
                        result['region'] = self.determine_region(dep_coords[0], dep_coords[1])
                if len(coord_matches) > 1:
                    arr_coords = self.parse_coordinates(coord_matches[1])
                    if arr_coords:
                        result['arrival_coords'] = coord_matches[1]
                        result['arrival_lat'], result['arrival_lon'] = arr_coords

            alt_matches = re.findall(r'M(\d{4})', flight_data)
            if alt_matches:
                result['altitude_min'] = int(alt_matches[0]) * 10 if alt_matches[0] != '0000' else 0
                if len(alt_matches) > 1:
                    result['altitude_max'] = int(alt_matches[1]) * 10
                else:
                    result['altitude_max'] = result['altitude_min']

            dof_match = re.search(r'DOF/(\d{6})', flight_data)
            flight_date = dof_match.group(1) if dof_match else None

            dep_time_match = re.search(r'ATD\s+(\d{4})', flight_data)
            if not dep_time_match:
                dep_time_match = re.search(r'ZZZZ(\d{4})', flight_data)
            dep_time = dep_time_match.group(1) if dep_time_match else None

            arr_time_match = re.search(r'ATA\s+(\d{4})', flight_data)
            if not arr_time_match:
                time_matches = re.findall(r'ZZZZ(\d{4})', flight_data)
                if len(time_matches) > 1:
                    arr_time = time_matches[1]
                else:
                    arr_time = None
            else:
                arr_time = arr_time_match.group(1)

            if flight_date and dep_time:
                result['departure_datetime'] = self.parse_date_time(flight_date, dep_time)
            if flight_date and arr_time:
                result['arrival_datetime'] = self.parse_date_time(flight_date, arr_time)

            if result['departure_datetime'] and result['arrival_datetime']:
                duration = result['arrival_datetime'] - result['departure_datetime']
                if duration.total_seconds() < 0:
                    result['arrival_datetime'] += timedelta(days=1)
                    duration = result['arrival_datetime'] - result['departure_datetime']
                result['duration_hours'] = round(duration.total_seconds() / 3600, 2)

            self.validation_stats['valid_records'] += 1

        except Exception as e:
            logger.error(f"Ошибка при парсинге плана полета: {e}")

        return result

    def create_unique_key(self, flight_plan: Dict) -> str:
        key_parts = [
            flight_plan.get('sid', ''),
            flight_plan.get('departure_coords', ''),
            flight_plan.get('departure_datetime', ''),
        ]
        key_string = '|'.join(str(part) for part in key_parts)
        return hashlib.md5(key_string.encode()).hexdigest()

    def clean_and_validate_batch(self, flight_plans: List[str]) -> List[Dict]:
        processed_plans = []
        seen_keys = set()
        for flight_data in flight_plans:
            parsed_plan = self.parse_flight_plan(flight_data)
            unique_key = self.create_unique_key(parsed_plan)
            if unique_key in seen_keys:
                self.validation_stats['duplicates_removed'] += 1
                continue
            seen_keys.add(unique_key)
            if parsed_plan.get('departure_datetime') is not None and parsed_plan.get('sid') is not None:
                parsed_plan = self.normalize_plan(parsed_plan)
                processed_plans.append(parsed_plan)
        return processed_plans

def load_flight_plans_from_excel_per_row(filename: str) -> List[str]:
    df = pd.read_excel(filename, sheet_name=None)
    flight_plans = []
    for sheet_name, sheet_data in df.items():
        for _, row in sheet_data.iterrows():
            row_text = ' '.join(row.dropna().astype(str).values)
            if row_text.strip():
                flight_plans.append(row_text)
    return flight_plans

def export_to_csv(data: List[Dict], filename: str):
    df = pd.DataFrame(data)
    df.rename(columns={
        'flight_id': 'ID полета',
        'sid': 'SID',
        'aircraft_type': 'Тип БПЛА',
        'departure_coords': 'Координаты взлета',
        'departure_lat': 'Широта взлета',
        'departure_lon': 'Долгота взлета',
        'departure_datetime': 'Дата и время взлета',
        'arrival_coords': 'Координаты посадки',
        'arrival_lat': 'Широта посадки',
        'arrival_lon': 'Долгота посадки',
        'arrival_datetime': 'Дата и время посадки',
        'duration_hours': 'Длительность (часы)',
        'region': 'Субъект РФ',
        'altitude_min': 'Минимальная высота (м)',
        'altitude_max': 'Максимальная высота (м)',
    }, inplace=True)
    df.to_csv(filename, index=False, encoding='utf-8')

if __name__ == "__main__":
    shapefile_path = 'admin_4.shp'
    parser = BPLAFlightPlanParser(shapefile_path)
    flight_plans_raw = load_flight_plans_from_excel_per_row('2025.xlsx')
    processed_plans = parser.clean_and_validate_batch(flight_plans_raw)
    export_to_csv(processed_plans, 'processed_bpla_flight_plans.csv')

    print("Отчет по обработке:", parser.validation_stats)
    print(f"Обработано планов: {len(processed_plans)}")
    if len(processed_plans) > 0:
        print("Пример обработанного плана:")
        print(processed_plans[0])
