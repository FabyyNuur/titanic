import pandas as pd
import plotly.io as pio


def charger_donnees(chemin: str, sep: str = ";") -> pd.DataFrame:
    pio.renderers.default = "plotly_mimetype+notebook_connected"
    return pd.read_csv(chemin, sep=sep)
