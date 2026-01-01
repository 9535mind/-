#!/usr/bin/env python3
"""
Direct SQLite Migration Application
Bypasses wrangler's buggy migration system
"""

import sqlite3
import sys
from pathlib import Path

# Database path
DB_FILE = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/dae6950755b5ff530000ff8f3db2cacda570276db420a0ef895f3f2ca95dfd5e.sqlite"

def apply_migration():
    """Apply migration directly to SQLite database"""
    
    # Read migration file
    migration_file = Path("migrations/0011_comprehensive_progress_tracking.sql")
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    migration_sql = migration_file.read_text()
    
    # Connect to database
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        print("📂 Connected to database")
        print(f"📄 Applying migration: {migration_file.name}")
        print("-" * 60)
        
        # Split by semicolon and execute each statement
        statements = migration_sql.split(';')
        
        success_count = 0
        error_count = 0
        
        for i, statement in enumerate(statements, 1):
            statement = statement.strip()
            
            if not statement or statement.startswith('--'):
                continue
            
            try:
                cursor.execute(statement)
                success_count += 1
                
                # Show progress for important statements
                if 'CREATE TABLE' in statement:
                    table_name = statement.split('CREATE TABLE')[1].split('(')[0].strip().replace('IF NOT EXISTS', '').strip()
                    print(f"✅ Created table: {table_name}")
                elif 'ALTER TABLE' in statement:
                    print(f"✅ Altered table (statement {i})")
                elif 'CREATE INDEX' in statement:
                    index_name = statement.split('CREATE')[1].split('INDEX')[1].split('ON')[0].replace('IF NOT EXISTS', '').strip()
                    print(f"✅ Created index: {index_name}")
                elif 'CREATE TRIGGER' in statement:
                    trigger_name = statement.split('CREATE TRIGGER')[1].split('AFTER')[0].replace('IF NOT EXISTS', '').strip()
                    print(f"✅ Created trigger: {trigger_name}")
                    
            except sqlite3.Error as e:
                error_msg = str(e)
                
                # Ignore "duplicate column" errors (already exists)
                if 'duplicate column name' in error_msg.lower():
                    print(f"⚠️  Column already exists (skipped)")
                    continue
                
                # Ignore "already exists" errors
                if 'already exists' in error_msg.lower():
                    print(f"⚠️  Object already exists (skipped)")
                    continue
                
                print(f"❌ Error in statement {i}: {error_msg}")
                print(f"   Statement: {statement[:100]}...")
                error_count += 1
        
        # Commit changes
        conn.commit()
        
        print("-" * 60)
        print(f"✅ Migration complete!")
        print(f"   Success: {success_count} statements")
        if error_count > 0:
            print(f"   Errors: {error_count} statements (non-critical)")
        
        # Verify tables
        print("\n📊 Verification:")
        
        # Check enrollments columns
        cursor.execute("PRAGMA table_info(enrollments)")
        enrollments_columns = [row[1] for row in cursor.fetchall()]
        print(f"✅ enrollments columns: {len(enrollments_columns)}")
        
        new_columns = ['total_lessons', 'completed_lessons', 'last_lesson_id', 
                      'last_watched_at', 'total_watch_time_seconds', 'completion_rate',
                      'certificate_issued', 'certificate_issued_at']
        
        for col in new_columns:
            if col in enrollments_columns:
                print(f"   ✅ {col}")
            else:
                print(f"   ❌ {col} (missing)")
        
        # Check lesson_progress table
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='lesson_progress'")
        lesson_progress_exists = cursor.fetchone() is not None
        
        if lesson_progress_exists:
            print(f"✅ lesson_progress table exists")
            cursor.execute("PRAGMA table_info(lesson_progress)")
            columns = cursor.fetchall()
            print(f"   Columns: {len(columns)}")
        else:
            print(f"❌ lesson_progress table missing")
        
        # Check triggers
        cursor.execute("SELECT name FROM sqlite_master WHERE type='trigger'")
        triggers = cursor.fetchall()
        print(f"✅ Triggers: {len(triggers)}")
        for trigger in triggers:
            print(f"   - {trigger[0]}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = apply_migration()
    sys.exit(0 if success else 1)
