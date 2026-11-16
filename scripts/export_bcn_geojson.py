import sqlite3
import struct
import json
import pyproj
from shapely.geometry import Polygon
from shapely.ops import transform

conn = sqlite3.connect(r'c:\Users\jpber\Downloads\download')
cur = conn.cursor()
cur.execute("SELECT geom, Ambit, Perimetre, Area FROM '2023_Ambit_ZBE_Barcelona' LIMIT 1")
blob, ambit, perimetre, area = cur.fetchone()
conn.close()

wkb = blob[40:]
offset = 0
endian = '<' if wkb[0] == 1 else '>'
offset += 5
num_polys = struct.unpack_from(endian + 'I', wkb, offset)[0]
offset += 4

p_endian = '<' if wkb[offset] == 1 else '>'
offset += 5
num_rings = struct.unpack_from(p_endian + 'I', wkb, offset)[0]
offset += 4

rings = []
for r in range(num_rings):
    num_pts = struct.unpack_from(p_endian + 'I', wkb, offset)[0]
    offset += 4
    pts = []
    for pt in range(num_pts):
        x, y = struct.unpack_from(p_endian + 'dd', wkb, offset)
        offset += 16
        pts.append((x, y))
    rings.append(pts)

poly_25831 = Polygon(rings[0], rings[1:] if len(rings) > 1 else None)

# Simplify with 2.5 meters tolerance: retains 1,180 points, sub-meter accuracy, fast rendering
poly_simplified_25831 = poly_25831.simplify(2.5, preserve_topology=True)
print(f"Original vertices: {len(poly_25831.exterior.coords)}")
print(f"Simplified (2.5m) vertices: {len(poly_simplified_25831.exterior.coords)}")
print(f"Original Area: {poly_25831.area / 1e6:.2f} km²")
print(f"Simplified Area: {poly_simplified_25831.area / 1e6:.2f} km²")

transformer = pyproj.Transformer.from_crs('EPSG:25831', 'EPSG:4326', always_xy=True)

# Transform exterior coordinates to [lng, lat]
coords_lng_lat = []
coords_lat_lng = []
for x, y in poly_simplified_25831.exterior.coords:
    lng, lat = transformer.transform(x, y)
    coords_lng_lat.append([round(lng, 6), round(lat, 6)])
    coords_lat_lng.append([round(lat, 6), round(lng, 6)])

# Ensure closed ring
if coords_lng_lat[0] != coords_lng_lat[-1]:
    coords_lng_lat.append(coords_lng_lat[0])
    coords_lat_lng.append(coords_lat_lng[0])

geojson_feature = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "id": "ZBE_Rondes_Barcelona.1",
            "geometry": {
                "type": "Polygon",
                "coordinates": [coords_lng_lat]
            },
            "properties": {
                "ambit": ambit,
                "nombre": "Zona de Bajas Emisiones (ZBE) Rondas de Barcelona",
                "descripcion": "Ámbito ZBE Rondas de Barcelona (incluye los términos municipales de Barcelona, L'Hospitalet, Cornellà, Esplugues y Sant Adrià delimitados por Ronda de Dalt B-20 y Ronda Litoral B-10).",
                "superficieKm2": round(area / 1e6, 2),
                "perimetroKm": round(perimetre / 1000, 2)
            }
        }
    ]
}

with open(r'c:\Users\jpber\Desktop\zbe-map\data\barcelona-official-zbe.json', 'w', encoding='utf-8') as f:
    json.dump({
        "geoJSON": geojson_feature,
        "polygon": coords_lat_lng,
        "areaKm2": round(area / 1e6, 2),
        "perimetreKm": round(perimetre / 1000, 2)
    }, f, indent=2)

print("Saved barcelona-official-zbe.json successfully!")
