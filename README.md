# 🚢 TITANIC MLOps - Dashboard & Registry

Une solution complète de MLOps pour la compétition Titanic de Kaggle, intégrant un pipeline d'analyse dynamique, un registre de modèles et une interface de prédiction premium (HUD).

---

## Vue d'Ensemble

Ce projet automatise le cycle de vie d'un modèle de Machine Learning :

- **Analyse & Entraînement** : Notebook Jupyter (`train.ipynb`) structuré.
- **Synchronisation Dynamique** : Le tableau de bord lit en temps réel les sorties du notebook via un parseur intelligent.
- **Déploiement API** : Backend Flask exposant les prédictions et les métriques.
- **Interface HUD (Cyber-Design)** : Frontend React moderne inspiré des interfaces de bord (Head-Up Display).

---

## 📂 Structure du Projet

```text
.
├── train.ipynb             # Analyse, EDA et Entraînement (Source de données)
├── mlops/                  # Cœur du système MLOps (Backend Flask)
│   ├── api/                # Endpoints HTTP (/api/predict, /api/notebook...)
│   ├── application/        # Cas d'usage (Inférence, Chargement modèles)
│   ├── domain/             # Logique métier et Validation
│   └── notebook_parser.py  # Moteur de synchronisation Notebook -> Dashboard
├── frontend/               # Interface utilisateur React + Vite (HTML/CSS/TS)
├── var/                    # Artefacts (Modèles enregistrés, Logs, Runs)
├── train_analysis/         # Modules Python d'analyse partagés
└── scripts/                # Utilitaires de maintenance
```

---

## Configuration & Lancement

### 1. Environnement Python (Backend)

Le backend utilise un environnement virtuel.

```bash
# Activation de l'environnement
source .venv/bin/activate

# Installation des dépendances
pip install -r requirements.txt (ou installer manuellement flask, pandas, sklearn, xgboost...)

# Lancement du serveur (Port 8000)
python -m mlops.app
```

### 2. Interface Utilisateur (Frontend)

Le frontend communique avec Flask via un proxy en développement et se build dans `frontend/dist`.

```bash
cd frontend
npm install
npm run dev
```

Accès : `http://localhost:5173` (ou `http://127.0.0.1:8000` si buildé).

---

## Fonctionnalités du Dashboard

Le dashboard est divisé en modules correspondant aux étapes du pipeline ML :

1. **Exploration** : Statistiques réelles du dataset Titanic.
2. **Visualisation** : Distribution de la survie par classe et genre.
3. **Préparation** : État des valeurs manquantes et étapes de nettoyage.
4. **Modélisation** : Classement dynamique des performances (Accuracy, F1).
5. **Sur-apprentissage** : Diagnostic des biais/variance (Train vs Test).
6. **Optimisation** : Paramètres trouvés par Grid Search.
7. **Ensemble** : Performances du modèle final (Voting Classifier).
8. **Prédiction** : Test unitaire (JSON) ou par lot (fichiers .csv, .xlsx, .txt).

---

## MLOps et Registre

Le système gère automatiquement un registre de modèles dans `var/registry.json`.

- Chaque entraînement réussi peut être promu en "Production".
- L'API de prédiction utilise toujours la version la plus stable par défaut.
- Monitoring en temps réel de la latence et de la dérive des données.

---

## Auteur

Développé dans le cadre de la modernisation du projet Titanic ML pour une démonstration MLOps complète.

---

## Déploiement sur Render

Le dépôt contient un fichier [render.yaml](render.yaml) prêt à l'emploi.

### 1. Prérequis

1. Pousser le projet sur GitHub.
2. Vérifier que [requirements.txt](requirements.txt) contient bien gunicorn.
3. Vérifier que le frontend build correctement avec npm run build dans [frontend/package.json](frontend/package.json).

### 2. Création du service

1. Ouvrir Render.
2. New + puis Blueprint.
3. Connecter le repository GitHub puis sélectionner le dépôt.
4. Render détecte automatiquement [render.yaml](render.yaml) et crée le service web.

### 3. Build et démarrage utilisés

- Build:
  pip install -r requirements.txt
  cd frontend
  npm ci
  npm run build

- Start:
  gunicorn mlops.app:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120

### 4. Vérification après déploiement

1. Vérifier la santé API sur /api/health.
2. Ouvrir la racine du service pour charger l'interface React servie par Flask.
3. Vérifier les endpoints principaux: /api/models, /api/predict, /api/metrics.

### 5. Important sur les données runtime

Le dossier var est écrit en runtime (logs, runs, registre). Sur Render, le filesystem est éphémère sans disque persistant.

Si tu veux conserver ces données entre redéploiements/redémarrages, utilise un disque persistant Render ou migre ces artefacts vers un stockage externe (base de données/objet).
