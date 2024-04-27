from extract import TextExtractor, ExtractKeyWord ,FileExtractor
import os
import sqlite3
import shutil

# Configuration des chemins
watched_folder = r"E:\M2AS"
folder_path = r"E:\M2AS_document"
os.makedirs(folder_path, exist_ok=True)
text_folder = r"E:\M2AS_document"
excluded_folders = ["Arduino", "node_modules", "dossier3"]
excluded_files = ["fichier1.txt", "fichier2.pdf", "fichier3.docx"]

# Créer un fichier temporaire 
temp_file_path = os.path.join(text_folder, 'temp_file.txt')
with open(temp_file_path, 'w') as temp_file:
    pass

# Utilisation de la classe TextExtractor pour extraire et sauvegarder le texte
text_extractor = TextExtractor(watched_folder, text_folder, excluded_folders, excluded_files)
text_extractor.extract_and_save_text()

# Connexion à la base de données SQLite
conn = sqlite3.connect('metadata.db')
c = conn.cursor()

# Création de la table pour stocker les métadonnées des fichiers
c.execute('''CREATE TABLE IF NOT EXISTS files
             (id INTEGER PRIMARY KEY,
             file_name TEXT,
             file_extension TEXT,
             author TEXT,
             creation_date TEXT,
             file_type TEXT,
             keywords TEXT)''')

# Parcourir tous les fichiers dans le dossier et extraire les métadonnées et les mots-clés
for root_folder, _, files in os.walk(watched_folder):
    if any(excluded_folder in root_folder for excluded_folder in excluded_folders):
        continue

    for file in files:
        file_path = os.path.join(root_folder, file)

        if file in excluded_files:
            continue

        if file.endswith(".txt") and os.path.dirname(file_path) == text_folder:
            continue

        extracted_data = FileExtractor(file_path)
        file_name = extracted_data.get_file_name()
        file_extension = os.path.splitext(file_name)[1]
        file_type = file_extension[1:].upper() if file_extension else "Non défini"
        author = "Votre Nom"  # Remplacez par l'auteur réel

        keywords = ExtractKeyWord().extraire_mot_cles(file_path)

        # Insérer les métadonnées et les mots-clés dans la base de données
        c.execute("INSERT INTO files (file_name, file_extension, author, creation_date, file_type, keywords) VALUES (?, ?, ?, ?, ?, ?)",
                  (file_name, file_extension, author, extracted_data.creation_date, file_type, keywords))

# Commit et fermeture de la connexion à la base de données
conn.commit()
conn.close()
os.remove(temp_file_path)
# Supprimer le  dossier M2AS_document
shutil.rmtree(text_folder)
