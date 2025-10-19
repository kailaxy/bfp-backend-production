import pandas as pd

# Simulate what the script is doing
# Historical data last date: 2024-10
last_period = pd.Period('2024-10', freq='M')

# Target periods: Starting from 2025-10 (current month), going 12 months
target_periods = []
start_year = 2025
start_month = 10

for i in range(12):
    current_month = start_month + i
    current_year = start_year
    while current_month > 12:
        current_month -= 12
        current_year += 1
    target_periods.append((current_year, current_month))

# Furthest target is 12 months from start (2026-09)
furthest_target = pd.Period(f'{target_periods[-1][0]}-{target_periods[-1][1]:02d}', freq='M')

# Calculate max_steps
max_steps = int((furthest_target - last_period).n)

print(f"Last historical period: {last_period}")
print(f"First target period: {target_periods[0]}")
print(f"Last target period: {target_periods[-1]}")
print(f"Furthest target: {furthest_target}")
print(f"Max steps calculated: {max_steps}")
print(f"\n⚠️ Problem: Script calculates {max_steps} steps, but should only forecast 12 steps!")
print(f"   This means it's forecasting from Oct 2024 → Sep 2026 (24 months)")
print(f"   But we only want the 12 months from Oct 2025 → Sep 2026")
