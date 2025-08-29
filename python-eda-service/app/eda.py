from __future__ import annotations
import io
import json
from typing import Dict, Any, List, Tuple

import numpy as np
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages

from .schema_detect import detect_schema

PALETTE = ["#4e79a7","#f28e2b","#e15759","#76b7b2","#59a14f","#edc949","#af7aa1","#ff9da7","#9c755f","#bab0ab"]
sns.set_theme(style="whitegrid")

def read_first_nonempty_sheet(content: bytes) -> pd.DataFrame:
    xls = pd.ExcelFile(io.BytesIO(content))
    for sh in xls.sheet_names:
        df = pd.read_excel(io.BytesIO(content), sheet_name=sh)
        if len(df) > 0:
            return df
    raise ValueError("No non-empty sheets found")

def coerce_dates(df: pd.DataFrame, col: str) -> pd.Series:
    s = pd.to_datetime(df[col], errors="coerce")
    if s.isna().all():
        s = pd.to_datetime(df[col], dayfirst=True, errors="coerce")
    return s

def eda_from_bytes(content: bytes) -> Tuple[Dict[str, Any], List[Tuple[str, bytes]], bytes]:
    """Return (metrics_json, [(image_name, image_bytes)], pdf_bytes)."""
    df = read_first_nonempty_sheet(content)
    df.columns = [str(c).strip() for c in df.columns]
    schema = detect_schema(df)

    # Compute helper columns
    if schema.get('date'):
        df[schema['date']] = coerce_dates(df, schema['date'])
    if not schema.get('price') and schema.get('sales') and schema.get('qty'):
        df["_unit_price"] = pd.to_numeric(df[schema['sales']], errors='coerce') / pd.to_numeric(df[schema['qty']], errors='coerce').replace(0, np.nan)
    else:
        df["_unit_price"] = pd.to_numeric(df.get(schema.get('price'), pd.Series([np.nan]*len(df))), errors='coerce')

    if not schema.get('sales') and schema.get('price') and schema.get('qty'):
        df["_sales"] = pd.to_numeric(df[schema['price']], errors='coerce') * pd.to_numeric(df[schema['qty']], errors='coerce')
    else:
        df["_sales"] = pd.to_numeric(df.get(schema.get('sales'), pd.Series([np.nan]*len(df))), errors='coerce')

    if schema.get('profit'):
        df["_profit"] = pd.to_numeric(df[schema['profit']], errors='coerce')
    else:
        df["_profit"] = np.nan

    if schema.get('discount'):
        df["_discount"] = pd.to_numeric(df[schema['discount']], errors='coerce')
    else:
        df["_discount"] = np.nan

    # KPIs
    kpi = {"rows": int(len(df)), "columns": int(len(df.columns))}
    if "_sales" in df:
        kpi["total_sales"] = float(np.nansum(df["_sales"].values))
        if schema.get('order_id') and schema['order_id'] in df:
            aov = df.groupby(schema['order_id'])["_sales"].sum().mean()
        else:
            aov = df["_sales"].mean()
        kpi["average_order_value"] = float(aov)
    if "_profit" in df and not pd.isna(df["_profit"]).all():
        kpi["total_profit"] = float(np.nansum(df["_profit"].values))
        if kpi.get("total_sales"):
            kpi["profit_margin"] = float(kpi["total_profit"]/kpi["total_sales"]) if kpi["total_sales"] else None

    # Aggregations
    images: List[Tuple[str, bytes]] = []
    pdf_buf = io.BytesIO()
    pp = PdfPages(pdf_buf)

    def save_current_fig(name: str, title: str):
        plt.suptitle(title, fontsize=14, fontweight="bold")
        plt.tight_layout(rect=[0, 0.03, 1, 0.95])
        img = io.BytesIO()
        plt.savefig(img, format='png', dpi=180, bbox_inches='tight')
        img.seek(0)
        images.append((name, img.getvalue()))
        pp.savefig(plt.gcf())
        plt.close()

    # A) Monthly sales/profit
    if schema.get('date') and "_sales" in df:
        ts = df.dropna(subset=[schema['date']]).copy()
        ts['month'] = ts[schema['date']].dt.to_period('M').dt.to_timestamp()
        monthly = ts.groupby('month').agg(sales=("_sales","sum"), profit=("_profit","sum")).reset_index()
        kpi["months"] = len(monthly)
        plt.figure(figsize=(10,5))
        sns.lineplot(data=monthly, x='month', y='sales', marker='o')
        plt.title('Monthly Sales Trend')
        plt.xlabel('Month'); plt.ylabel('Sales')
        save_current_fig('trend_sales.png', 'Trend: Sales Over Time')
        if not monthly['profit'].isna().all():
            plt.figure(figsize=(10,5))
            sns.lineplot(data=monthly, x='month', y='profit', marker='o')
            plt.title('Monthly Profit Trend')
            plt.xlabel('Month'); plt.ylabel('Profit')
            save_current_fig('trend_profit.png', 'Trend: Profit Over Time')

    # B) Best available categorical dimension for mix
    cat_dim = next((c for c in [schema.get('category'), schema.get('subcat'), schema.get('product')] if c and c in df), None)
    if cat_dim and "_sales" in df:
        top = df.groupby(cat_dim)["_sales"].sum().sort_values(ascending=False).head(15)
        plt.figure(figsize=(10,6))
        sns.barplot(x=top.index, y=top.values)
        plt.xticks(rotation=35, ha='right'); plt.ylabel('Sales')
        plt.title(f'Top {min(15, len(top))} by Sales – {cat_dim}')
        save_current_fig('mix_category.png', 'Category Contribution to Sales')

    # C) Region/Geo mix
    if schema.get('region') and "_sales" in df and schema['region'] in df:
        geo = df.groupby(schema['region'])["_sales"].sum().sort_values(ascending=False)
        plt.figure(figsize=(10,6))
        sns.barplot(x=geo.index, y=geo.values)
        plt.xticks(rotation=35, ha='right'); plt.ylabel('Sales'); plt.title('Sales by Region')
        save_current_fig('mix_region.png', 'Geographic Sales Mix')

    # D) Order value distribution
    if schema.get('order_id') and "_sales" in df and schema['order_id'] in df:
        order_sales = df.groupby(schema['order_id'])["_sales"].sum()
        plt.figure(figsize=(9,5))
        plt.hist(order_sales.dropna(), bins=30)
        plt.title('Distribution of Order Values'); plt.xlabel('Order Value'); plt.ylabel('Frequency')
        save_current_fig('hist_order_values.png', 'Order Value Distribution')

    # E) Customer Pareto
    if schema.get('customer') and "_sales" in df and schema['customer'] in df:
        cust_sales = df.groupby(schema['customer'])["_sales"].sum().sort_values(ascending=False)
        cum = cust_sales.cumsum() / cust_sales.sum()
        plt.figure(figsize=(10,6))
        ax1 = plt.gca()
        sns.barplot(x=cust_sales.head(20).index, y=cust_sales.head(20).values, ax=ax1)
        ax1.set_xlabel('Top Customers'); ax1.set_ylabel('Sales');
        ax1.tick_params(axis='x', rotation=35)
        ax2 = ax1.twinx(); ax2.plot(range(len(cust_sales.head(20))), cum.head(20).values, marker='o')
        ax2.set_ylabel('Cumulative Share')
        plt.title('Top Customers & Cumulative Share')
        save_current_fig('pareto_customers.png', 'Customer Concentration (Pareto)')

    # F) Price vs Quantity bubble
    if schema.get('qty') and "_unit_price" in df and "_sales" in df:
        sample = df[[schema['qty'], "_unit_price", "_sales"]].replace([np.inf,-np.inf], np.nan).dropna().copy()
        if len(sample) > 5000:
            sample = sample.sample(5000, random_state=42)
        denom = sample["_sales"].max() or 1.0
        sizes = (sample["_sales"] / denom) * 400 + 10
        plt.figure(figsize=(9,6))
        plt.scatter(sample["_unit_price"], sample[schema['qty']], s=sizes, alpha=0.6)
        plt.title('Unit Price vs Quantity (bubble = Sales)'); plt.xlabel('Unit Price'); plt.ylabel('Quantity')
        save_current_fig('bubble_price_qty.png', 'Price-Quantity Dynamics')

    # Close PDF
    pp.close()
    pdf_buf.seek(0)

    chart_data = {
        "kpi": kpi,
        "schema": schema,
        "charts": [name for name, _ in images]
    }

    return chart_data, images, pdf_buf.getvalue()