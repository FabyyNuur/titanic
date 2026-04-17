from IPython.display import display, HTML

_STYLE_DIV = (
    "margin-top:14px; padding:16px 18px; border-left:6px solid #1f5a7a; "
    "background:linear-gradient(135deg, #f7fbff 0%, #eef6fb 100%); "
    "border-radius:12px; color:#10222f; box-shadow:0 6px 16px rgba(21, 52, 72, 0.10); "
    "font-family:'Segoe UI', Tahoma, sans-serif; line-height:1.55;"
)
_STYLE_H3 = "margin:0 0 10px 0; color:#174964; font-size:1.05rem; letter-spacing:0.2px;"
_STYLE_P = "margin:8px 0; color:#163447;"


def _afficher(html: str) -> None:
    display(HTML(html))


def render_interpretation(
    paragraphs: list[str],
    title: str = "Interprétation",
    container_style: str = _STYLE_DIV,
    title_style: str = _STYLE_H3,
    paragraph_style: str = _STYLE_P,
) -> None:
    """
    Affiche un bloc d'interprétation réutilisable.

    Parameters
    ----------
    paragraphs : list[str]
        Liste des paragraphes HTML à afficher.
    title : str
        Titre du bloc.
    container_style : str
        Style inline du conteneur principal.
    title_style : str
        Style inline du titre.
    paragraph_style : str
        Style inline des paragraphes.
    """
    paragraphs_html = "".join(
        f'<p style="{paragraph_style}">{paragraph}</p>' for paragraph in paragraphs
    )
    title_html = f'<h3 style="{title_style}">{title}</h3>' if title else ""
    html = f"""
<div style="{container_style}">
  {title_html}
  {paragraphs_html}
</div>
"""
    _afficher(html)
