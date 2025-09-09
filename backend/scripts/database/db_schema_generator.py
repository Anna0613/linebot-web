#!/usr/bin/env python3
"""
資料庫架構生成器
用於生成資料庫架構報告和文檔
"""
import os
import sys
from typing import Dict, List, Any
from datetime import datetime
from sqlalchemy import MetaData, Table, Column, text
from sqlalchemy.engine import Engine

# 添加專案路徑
current_dir = os.path.dirname(os.path.abspath(__file__))
scripts_dir = os.path.dirname(current_dir)
backend_dir = os.path.dirname(scripts_dir)
sys.path.insert(0, backend_dir)

from app.config import settings
from app.database import engine


def get_database_schema() -> Dict[str, Any]:
    """
    獲取資料庫架構信息
    
    Returns:
        Dict[str, Any]: 包含所有表格架構信息的字典
    """
    # 使用從 database 模組導入的 engine
    metadata = MetaData()
    
    try:
        # 反射現有的資料庫架構
        metadata.reflect(bind=engine)
        
        schema_info = {
            "database_url": settings.DATABASE_URL.replace(settings.DATABASE_PASSWORD, "***"),
            "generated_at": datetime.now().isoformat(),
            "tables": {}
        }
        
        for table_name, table in metadata.tables.items():
            table_info = {
                "columns": [],
                "primary_keys": [],
                "foreign_keys": [],
                "indexes": []
            }
            
            # 收集欄位信息
            for column in table.columns:
                column_info = {
                    "name": column.name,
                    "type": str(column.type),
                    "nullable": column.nullable,
                    "default": str(column.default) if column.default else None,
                    "autoincrement": getattr(column, 'autoincrement', False)
                }
                table_info["columns"].append(column_info)
            
            # 收集主鍵
            for pk in table.primary_key.columns:
                table_info["primary_keys"].append(pk.name)
            
            # 收集外鍵
            for fk in table.foreign_keys:
                fk_info = {
                    "column": fk.parent.name,
                    "references": f"{fk.column.table.name}.{fk.column.name}"
                }
                table_info["foreign_keys"].append(fk_info)
            
            # 收集索引
            for index in table.indexes:
                index_info = {
                    "name": index.name,
                    "columns": [col.name for col in index.columns],
                    "unique": index.unique
                }
                table_info["indexes"].append(index_info)
            
            schema_info["tables"][table_name] = table_info
        
        return schema_info
        
    except Exception as e:
        return {
            "error": f"獲取資料庫架構失敗: {str(e)}",
            "generated_at": datetime.now().isoformat(),
            "tables": {}
        }


def format_schema_report(schema_info: Dict[str, Any]) -> str:
    """
    格式化架構報告為 Markdown 格式
    
    Args:
        schema_info: 從 get_database_schema() 獲取的架構信息
    
    Returns:
        str: Markdown 格式的架構報告
    """
    report = []
    
    # 標題和基本信息
    report.append("# 資料庫架構報告")
    report.append("")
    report.append(f"**生成時間**: {schema_info.get('generated_at', 'N/A')}")
    
    if 'database_url' in schema_info:
        report.append(f"**資料庫連線**: {schema_info['database_url']}")
    
    if 'error' in schema_info:
        report.append("")
        report.append("## ❌ 錯誤")
        report.append(f"{schema_info['error']}")
        return "\n".join(report)
    
    report.append("")
    report.append(f"**表格數量**: {len(schema_info['tables'])}")
    report.append("")
    
    # 目錄
    report.append("## 📑 目錄")
    report.append("")
    for table_name in sorted(schema_info['tables'].keys()):
        report.append(f"- [{table_name}](#{table_name.replace('_', '-')})")
    report.append("")
    
    # 表格詳細信息
    report.append("## 📊 表格詳細信息")
    report.append("")
    
    for table_name, table_info in sorted(schema_info['tables'].items()):
        report.append(f"### {table_name}")
        report.append("")
        
        # 欄位信息
        if table_info['columns']:
            report.append("#### 欄位")
            report.append("")
            report.append("| 欄位名 | 類型 | 可空值 | 預設值 | 自動遞增 |")
            report.append("|--------|------|--------|--------|----------|")
            
            for col in table_info['columns']:
                nullable = "✅" if col['nullable'] else "❌"
                autoincrement = "✅" if col['autoincrement'] else "❌"
                default = col['default'] or "-"
                report.append(f"| {col['name']} | {col['type']} | {nullable} | {default} | {autoincrement} |")
            report.append("")
        
        # 主鍵
        if table_info['primary_keys']:
            report.append("#### 主鍵")
            report.append("")
            for pk in table_info['primary_keys']:
                report.append(f"- `{pk}`")
            report.append("")
        
        # 外鍵
        if table_info['foreign_keys']:
            report.append("#### 外鍵")
            report.append("")
            for fk in table_info['foreign_keys']:
                report.append(f"- `{fk['column']}` → `{fk['references']}`")
            report.append("")
        
        # 索引
        if table_info['indexes']:
            report.append("#### 索引")
            report.append("")
            report.append("| 索引名 | 欄位 | 唯一性 |")
            report.append("|--------|------|--------|")
            
            for idx in table_info['indexes']:
                unique = "✅" if idx['unique'] else "❌"
                columns = ", ".join(idx['columns'])
                report.append(f"| {idx['name']} | {columns} | {unique} |")
            report.append("")
        
        report.append("---")
        report.append("")
    
    # 統計信息
    report.append("## 📈 統計信息")
    report.append("")
    
    total_columns = sum(len(table_info['columns']) for table_info in schema_info['tables'].values())
    total_indexes = sum(len(table_info['indexes']) for table_info in schema_info['tables'].values())
    total_foreign_keys = sum(len(table_info['foreign_keys']) for table_info in schema_info['tables'].values())
    
    report.append(f"- **總表格數**: {len(schema_info['tables'])}")
    report.append(f"- **總欄位數**: {total_columns}")
    report.append(f"- **總索引數**: {total_indexes}")
    report.append(f"- **總外鍵數**: {total_foreign_keys}")
    report.append("")
    
    # 表格關聯圖 (Mermaid)
    if schema_info['tables']:
        report.append("## 🔗 表格關聯圖")
        report.append("")
        report.append("```mermaid")
        report.append("erDiagram")
        
        # 定義表格
        for table_name, table_info in schema_info['tables'].items():
            # 簡化表格定義，只顯示主要欄位
            key_columns = []
            for col in table_info['columns'][:5]:  # 只顯示前5個欄位
                col_type = col['type'].split('(')[0]  # 移除類型參數
                key_columns.append(f"    {col_type} {col['name']}")
            
            if len(table_info['columns']) > 5:
                key_columns.append("    ... more_columns")
            
            report.append(f"    {table_name.upper()} {{")
            report.extend(key_columns)
            report.append("    }")
        
        # 定義關聯
        for table_name, table_info in schema_info['tables'].items():
            for fk in table_info['foreign_keys']:
                ref_table = fk['references'].split('.')[0]
                report.append(f"    {table_name.upper()} ||--o{{ {ref_table.upper()} : {fk['column']}")
        
        report.append("```")
        report.append("")
    
    report.append("---")
    report.append("")
    report.append("*此報告由 LineBot-Web 資料庫架構生成器自動產生*")
    
    return "\n".join(report)


def generate_migration_sql(schema_info: Dict[str, Any]) -> str:
    """
    根據架構信息生成建表 SQL
    
    Args:
        schema_info: 資料庫架構信息
    
    Returns:
        str: SQL 建表語句
    """
    sql_statements = []
    
    sql_statements.append("-- 資料庫架構 SQL")
    sql_statements.append(f"-- 生成時間: {schema_info.get('generated_at', 'N/A')}")
    sql_statements.append("")
    
    for table_name, table_info in schema_info['tables'].items():
        sql_statements.append(f"-- 表格: {table_name}")
        sql_statements.append(f"CREATE TABLE IF NOT EXISTS {table_name} (")
        
        column_definitions = []
        for col in table_info['columns']:
            col_def = f"    {col['name']} {col['type']}"
            
            if not col['nullable']:
                col_def += " NOT NULL"
            
            if col['default']:
                col_def += f" DEFAULT {col['default']}"
            
            column_definitions.append(col_def)
        
        # 添加主鍵約束
        if table_info['primary_keys']:
            pk_columns = ", ".join(table_info['primary_keys'])
            column_definitions.append(f"    PRIMARY KEY ({pk_columns})")
        
        sql_statements.append(",\n".join(column_definitions))
        sql_statements.append(");")
        sql_statements.append("")
        
        # 添加索引
        for idx in table_info['indexes']:
            if not idx['unique']:  # 主鍵和唯一約束會自動創建索引
                columns = ", ".join(idx['columns'])
                sql_statements.append(f"CREATE INDEX IF NOT EXISTS {idx['name']} ON {table_name} ({columns});")
        
        sql_statements.append("")
    
    return "\n".join(sql_statements)


if __name__ == "__main__":
    """命令行接口"""
    import argparse
    
    parser = argparse.ArgumentParser(description="資料庫架構生成器")
    parser.add_argument(
        "--format",
        choices=["markdown", "sql", "json"],
        default="markdown",
        help="輸出格式"
    )
    parser.add_argument(
        "--output",
        help="輸出檔案路徑（預設輸出到控制台）"
    )
    
    args = parser.parse_args()
    
    # 獲取架構信息
    schema_info = get_database_schema()
    
    # 格式化輸出
    if args.format == "markdown":
        output = format_schema_report(schema_info)
    elif args.format == "sql":
        output = generate_migration_sql(schema_info)
    elif args.format == "json":
        import json
        output = json.dumps(schema_info, indent=2, ensure_ascii=False)
    
    # 輸出結果
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(output)
        print(f"✅ 輸出已儲存至: {args.output}")
    else:
        print(output)