import pandas as pd

# Leer el archivo CSV
csv_file = "datospoint.csv"  
data = pd.read_csv(csv_file)

# Convertir a JSON
json_file = "output.json"  # Nombre del archivo JSON resultante
data.to_json(json_file, orient="records", indent=4)

print(f"Archivo JSON creado: {json_file}")

