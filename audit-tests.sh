#!/bin/bash

echo "🔍 Auditing test performance (excluding tunnel-server)..."
echo ""

total_time=0
packages=("chrome-extension" "cli" "preview-ui" "shared" "web-sdk" "relay-server")

for pkg in "${packages[@]}"; do
    echo "=== Testing $pkg ==="
    cd packages/$pkg
    
    if [ -f "package.json" ]; then
        start_time=$(date +%s)
        npm test --silent > /dev/null 2>&1
        exit_code=$?
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        
        if [ $exit_code -eq 0 ]; then
            echo "✅ $pkg: ${duration}s"
        else
            echo "❌ $pkg: ${duration}s (failed)"
        fi
        
        total_time=$((total_time + duration))
    else
        echo "⚠️  $pkg: No package.json found"
    fi
    
    cd ../..
    echo ""
done

echo "📊 Total test time: ${total_time}s"

if [ $total_time -lt 10 ]; then
    echo "🎉 DONE"
else
    echo "⏱️  NO"
fi
