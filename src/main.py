import json

def get_system_info():
    return {
        "username": "alok",
        "os": "Arch Linux",
        "uptime": "2 days, 4 hours"
    }

if __name__ == "__main__":
    data = get_system_info()
    print(json.dumps(data))  # Ensures JSON output
