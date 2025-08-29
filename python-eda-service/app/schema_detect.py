from __future__ import annotations
from typing import Optional, Dict, List
import pandas as pd

CANDIDATES = {
    'date': ["order date","order_date","date","invoice date","transaction date","dt"],
    'sales': ["sales","amount","revenue","total","invoice amount","net sales"],
    'profit': ["profit","margin","gross profit","net profit"],
    'qty': ["quantity","qty","units"],
    'price': ["price","unit price","selling price"],
    'discount': ["discount","disc"],
    'customer': ["customer","customer name","client","customer_id","cust id"],
    'product': ["product","item","sku","product name","product_id"],
    'category': ["category","segment","product category"],
    'subcat': ["sub-category","subcategory","sub category"],
    'region': ["region","state","city","market","territory","country"],
    'order_id': ["order id","order_id","invoice","invoice id","order no"],
    'rep': ["rep","sales rep","salesperson","agent"]
}

def find_col(df: pd.DataFrame, keys: List[str]) -> Optional[str]:
    cols = [c for c in df.columns if isinstance(c, str)]
    for c in cols:
        lc = c.strip().lower()
        for k in keys:
            if k == lc or k in lc:
                return c
    return None

def detect_schema(df: pd.DataFrame) -> Dict[str, Optional[str]]:
    d = {}
    for name, keys in CANDIDATES.items():
        d[name] = find_col(df, keys)
    return d