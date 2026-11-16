#!/usr/bin/env python3
import csv
import sys
import json
import urllib.request
import urllib.error
import time

csv.field_size_limit(sys.maxsize)

CSV_PATH = '/Users/rifqiwariyanto/Downloads/pustaka/brosur_rows.csv'
SUPABASE_URL = 'https://supabase.brosurmta.my.id/rest/v1/brosur'
SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q'

HEADERS = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
}

def main():
    print(f"Membuka file: {CSV_PATH}...")
    
    records = []
    with open(CSV_PATH, mode='r', encoding='utf-8', errors='ignore') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                tahun_val = int(row['tahun']) if row.get('tahun') and row['tahun'].strip().isdigit() else 2026
            except ValueError:
                tahun_val = 2026
                
            payload = {
                'id': row['id'],
                'tahun': tahun_val,
                'judul': row.get('judul', ''),
                'slug': row.get('slug', ''),
                'konten': row.get('konten', ''),
                'teks_bersih': row.get('teks_bersih', ''),
                'folder_id': row.get('folder_id') if row.get('folder_id') else None
            }
            records.append(payload)

    total = len(records)
    print(f"Total data brosur ditemukan: {total} baris.")
    print("Memulai proses upload ke Supabase Self-Hosted dalam batch 25 baris...\n")

    batch_size = 3
    success_count = 0

    for i in range(0, total, batch_size):
        batch = records[i:i + batch_size]
        data_json = json.dumps(batch).encode('utf-8')
        
        req = urllib.request.Request(SUPABASE_URL, data=data_json, headers=HEADERS, method='POST')
        
        retry = 0
        while retry < 3:
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    if resp.status in (200, 201):
                        success_count += len(batch)
                        percent = (success_count / total) * 100
                        print(f"[{success_count}/{total}] ({percent:.1f}%) Berhasil diimpor...")
                        break
            except urllib.error.HTTPError as e:
                err_msg = e.read().decode('utf-8', errors='ignore')
                print(f"Error pada batch {i}: {e.code} - {err_msg}")
                retry += 1
                time.sleep(2)
            except Exception as e:
                print(f"Error jaringan: {e}")
                retry += 1
                time.sleep(2)

    print(f"\nSelesai! Berhasil mengimpor {success_count} dari {total} brosur ke database.")

if __name__ == '__main__':
    main()
