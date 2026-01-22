"""
Sector Opportunity Analyzer - Streamlit Application

A tool for analyzing economic sectors and identifying investment opportunities
based on momentum, valuation, growth, innovation, and macro factors.
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots

from config import SECTOR_ETFS, SCORING_WEIGHTS
from data.fetchers import fetch_all_data
from data.cache_manager import get_cache_info, clear_cache
from analysis.scoring import SectorScorer, run_analysis


# =============================================================================
# PAGE CONFIG
# =============================================================================

st.set_page_config(
    page_title="Sector Opportunity Analyzer",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .metric-card {
        background-color: #f0f2f6;
        border-radius: 10px;
        padding: 20px;
        margin: 10px 0;
    }
    .top-sector {
        color: #28a745;
        font-weight: bold;
    }
    .bottom-sector {
        color: #dc3545;
    }
</style>
""", unsafe_allow_html=True)


# =============================================================================
# SIDEBAR
# =============================================================================

st.sidebar.title("⚙️ Settings")

# Weight adjustments
st.sidebar.subheader("Signal Weights")
st.sidebar.caption("Adjust how much each factor contributes to the score")

momentum_weight = st.sidebar.slider(
    "Momentum", 0.0, 0.5, SCORING_WEIGHTS['momentum'], 0.05,
    help="Price performance and relative strength"
)
valuation_weight = st.sidebar.slider(
    "Valuation", 0.0, 0.5, SCORING_WEIGHTS['valuation'], 0.05,
    help="Forward P/E attractiveness"
)
growth_weight = st.sidebar.slider(
    "Growth", 0.0, 0.5, SCORING_WEIGHTS['growth'], 0.05,
    help="Employment growth trends"
)
innovation_weight = st.sidebar.slider(
    "Innovation", 0.0, 0.5, SCORING_WEIGHTS['innovation'], 0.05,
    help="R&D intensity"
)
macro_weight = st.sidebar.slider(
    "Macro", 0.0, 0.5, SCORING_WEIGHTS['macro'], 0.05,
    help="Interest rate sensitivity"
)

# Normalize weights to sum to 1.0
total_weight = momentum_weight + valuation_weight + growth_weight + innovation_weight + macro_weight
if total_weight > 0:
    custom_weights = {
        'momentum': momentum_weight / total_weight,
        'valuation': valuation_weight / total_weight,
        'growth': growth_weight / total_weight,
        'innovation': innovation_weight / total_weight,
        'macro': macro_weight / total_weight,
    }
else:
    custom_weights = SCORING_WEIGHTS

st.sidebar.markdown("---")

# Cache controls
st.sidebar.subheader("Cache Management")
cache_info = get_cache_info()
st.sidebar.text(f"Cached files: {cache_info['valid_files']}")
st.sidebar.text(f"Cache size: {cache_info['total_size_mb']} MB")

if st.sidebar.button("🔄 Clear Cache & Refresh"):
    clear_cache()
    st.cache_data.clear()
    st.rerun()


# =============================================================================
# DATA LOADING
# =============================================================================

@st.cache_data(ttl=43200)  # 12 hours
def load_data():
    """Load all data with caching."""
    with st.spinner("Fetching data from multiple sources..."):
        return fetch_all_data()


@st.cache_data(ttl=43200)
def compute_scores(_data, weights_tuple):
    """Compute scores with caching (weights as tuple for hashability)."""
    weights = dict(weights_tuple)
    return run_analysis(_data, weights)


# =============================================================================
# MAIN CONTENT
# =============================================================================

st.title("📊 Sector Opportunity Analyzer")
st.markdown("*Identifying sectors with the greatest potential over the next 2 years*")

# Load data
try:
    data = load_data()
except Exception as e:
    st.error(f"Error loading data: {e}")
    st.info("Please check your API keys in environment variables (FMP_API_KEY, FRED_API_KEY)")
    st.stop()

# Compute scores
weights_tuple = tuple(custom_weights.items())
scores, summary = compute_scores(data, weights_tuple)

# =============================================================================
# OVERVIEW SECTION
# =============================================================================

st.header("📈 Sector Rankings")

# Create columns for top metrics
col1, col2, col3, col4 = st.columns(4)

with col1:
    top = summary['top_sectors'][0]
    st.metric(
        label="🥇 Top Sector",
        value=top['sector'],
        delta=f"Score: {top['score']}"
    )

with col2:
    second = summary['top_sectors'][1]
    st.metric(
        label="🥈 Second",
        value=second['sector'],
        delta=f"Score: {second['score']}"
    )

with col3:
    third = summary['top_sectors'][2]
    st.metric(
        label="🥉 Third",
        value=third['sector'],
        delta=f"Score: {third['score']}"
    )

with col4:
    dist = summary['score_distribution']
    st.metric(
        label="📊 Score Spread",
        value=f"{dist['spread']:.1f}",
        delta=f"Avg: {dist['average']:.1f}"
    )

st.markdown("---")

# =============================================================================
# RANKINGS VISUALIZATION
# =============================================================================

col_chart, col_table = st.columns([3, 2])

with col_chart:
    st.subheader("Opportunity Score by Sector")

    # Create horizontal bar chart
    df_scores = pd.DataFrame([s.to_dict() for s in scores])
    df_scores = df_scores.sort_values('opportunity_score', ascending=True)

    fig = px.bar(
        df_scores,
        x='opportunity_score',
        y='sector',
        orientation='h',
        color='opportunity_score',
        color_continuous_scale='RdYlGn',
        range_color=[30, 70],
    )
    fig.update_layout(
        height=500,
        showlegend=False,
        xaxis_title="Opportunity Score",
        yaxis_title="",
        coloraxis_showscale=False,
    )
    fig.update_traces(texttemplate='%{x:.1f}', textposition='outside')

    st.plotly_chart(fig, use_container_width=True)

with col_table:
    st.subheader("Rankings Table")

    # Display rankings table
    display_df = df_scores[['rank', 'sector', 'opportunity_score']].sort_values('rank')
    display_df.columns = ['Rank', 'Sector', 'Score']

    st.dataframe(
        display_df,
        hide_index=True,
        use_container_width=True,
        height=450
    )

st.markdown("---")

# =============================================================================
# COMPONENT SCORES BREAKDOWN
# =============================================================================

st.header("🔍 Score Breakdown")

# Radar chart for component comparison
st.subheader("Component Scores by Sector")

# Let user select sectors to compare
selected_sectors = st.multiselect(
    "Select sectors to compare",
    options=[s.sector for s in scores],
    default=[scores[0].sector, scores[1].sector, scores[-1].sector]
)

if selected_sectors:
    categories = ['Momentum', 'Valuation', 'Growth', 'Innovation', 'Macro']

    fig = go.Figure()

    for sector_name in selected_sectors:
        sector_score = next((s for s in scores if s.sector == sector_name), None)
        if sector_score:
            values = [
                sector_score.momentum_score,
                sector_score.valuation_score,
                sector_score.growth_score,
                sector_score.innovation_score,
                sector_score.macro_score,
            ]
            # Close the radar chart
            values.append(values[0])
            cats = categories + [categories[0]]

            fig.add_trace(go.Scatterpolar(
                r=values,
                theta=cats,
                name=sector_name,
                fill='toself',
                opacity=0.6
            ))

    fig.update_layout(
        polar=dict(
            radialaxis=dict(visible=True, range=[0, 100])
        ),
        showlegend=True,
        height=500,
    )

    st.plotly_chart(fig, use_container_width=True)

# Component scores heatmap
st.subheader("Component Scores Heatmap")

heatmap_data = []
for s in scores:
    heatmap_data.append({
        'Sector': s.sector,
        'Momentum': s.momentum_score,
        'Valuation': s.valuation_score,
        'Growth': s.growth_score,
        'Innovation': s.innovation_score,
        'Macro': s.macro_score,
    })

heatmap_df = pd.DataFrame(heatmap_data)
heatmap_df = heatmap_df.set_index('Sector')

fig_heatmap = px.imshow(
    heatmap_df.values,
    labels=dict(x="Signal", y="Sector", color="Score"),
    x=heatmap_df.columns,
    y=heatmap_df.index,
    color_continuous_scale='RdYlGn',
    range_color=[30, 70],
    aspect='auto',
)
fig_heatmap.update_layout(height=500)

st.plotly_chart(fig_heatmap, use_container_width=True)

st.markdown("---")

# =============================================================================
# SECTOR DETAILS
# =============================================================================

st.header("📋 Sector Details")

selected_sector = st.selectbox(
    "Select a sector to view details",
    options=[s.sector for s in scores],
    index=0
)

sector_detail = next((s for s in scores if s.sector == selected_sector), None)

if sector_detail:
    col1, col2 = st.columns(2)

    with col1:
        st.subheader(f"{selected_sector}")
        st.metric("Opportunity Score", f"{sector_detail.opportunity_score:.1f}", f"Rank #{sector_detail.rank}")

        st.markdown("**Component Scores:**")
        components = {
            'Momentum': sector_detail.momentum_score,
            'Valuation': sector_detail.valuation_score,
            'Growth': sector_detail.growth_score,
            'Innovation': sector_detail.innovation_score,
            'Macro': sector_detail.macro_score,
        }

        for component, score in components.items():
            # Color based on score
            if score >= 60:
                emoji = "🟢"
            elif score >= 40:
                emoji = "🟡"
            else:
                emoji = "🔴"
            st.write(f"{emoji} {component}: {score:.1f}")

    with col2:
        st.markdown("**Raw Metrics:**")

        metrics = [
            ("3-Month Return", sector_detail.price_return_3mo, "%"),
            ("6-Month Return", sector_detail.price_return_6mo, "%"),
            ("12-Month Return", sector_detail.price_return_12mo, "%"),
            ("Relative Strength vs S&P", sector_detail.relative_strength, "%"),
            ("Forward P/E", sector_detail.forward_pe, ""),
            ("Employment Growth (YoY)", sector_detail.employment_growth, "%"),
            ("R&D Intensity", sector_detail.rd_intensity, "%"),
        ]

        for name, value, suffix in metrics:
            if value is not None:
                if suffix == "%":
                    st.write(f"• {name}: {value:.2f}{suffix}")
                else:
                    st.write(f"• {name}: {value:.2f}")
            else:
                st.write(f"• {name}: N/A")

st.markdown("---")

# =============================================================================
# DATA QUALITY INDICATOR
# =============================================================================

st.header("📊 Data Quality")

data_status = {
    'Sector Prices (yfinance)': '✅' if data.get('sector_prices') else '❌',
    'Sector Info (yfinance)': '✅' if data.get('sector_info') else '❌',
    'Macro Data (FRED)': '✅' if data.get('macro_data') else '⚠️ Check FRED_API_KEY',
    'Sector P/E (FMP)': '✅' if data.get('sector_pe') else '⚠️ Check FMP_API_KEY',
    'Employment (BLS)': '✅' if data.get('employment_data') else '⚠️ Limited without API key',
    'R&D Data (Damodaran)': '✅' if data.get('rd_data') else '❌',
}

cols = st.columns(3)
for i, (source, status) in enumerate(data_status.items()):
    with cols[i % 3]:
        st.write(f"{status} {source}")

st.markdown("---")

# =============================================================================
# FOOTER
# =============================================================================

st.caption(f"Data last updated: {summary.get('timestamp', 'Unknown')}")
st.caption("Weights used: " + ", ".join(f"{k}: {v:.0%}" for k, v in custom_weights.items()))
st.caption("Note: This tool is for informational purposes only. Not investment advice.")
