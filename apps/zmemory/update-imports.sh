#!/bin/bash

# Script to update imports from old lib structure to new path aliases
# This ensures backward compatibility while moving to the new organized structure

echo "Updating import paths to use new structure..."

# Find all API route files
find app/api -name "*.ts" | while read -r file; do
    echo "Processing: $file"

    # Update auth imports
    sed -i '' 's|from ['"'"'"][./]*lib/auth['"'"'"]|from '"'"'@/auth'"'"'|g' "$file"
    sed -i '' 's|from ['"'"'"]../../../lib/auth['"'"'"]|from '"'"'@/auth'"'"'|g' "$file"
    sed -i '' 's|from ['"'"'"]../../../../lib/auth['"'"'"]|from '"'"'@/auth'"'"'|g' "$file"
    sed -i '' 's|from ['"'"'"]../../../../../lib/auth['"'"'"]|from '"'"'@/auth'"'"'|g' "$file"

    # Update security imports
    sed -i '' 's|from ['"'"'"][./]*lib/security['"'"'"]|from '"'"'@/lib/security'"'"'|g' "$file"
    sed -i '' 's|from ['"'"'"]../../../lib/security['"'"'"]|from '"'"'@/lib/security'"'"'|g' "$file"
    sed -i '' 's|from ['"'"'"]../../../../lib/security['"'"'"]|from '"'"'@/lib/security'"'"'|g' "$file"
    sed -i '' 's|from ['"'"'"]../../../../../lib/security['"'"'"]|from '"'"'@/lib/security'"'"'|g' "$file"

    # Update validators imports to use validation
    sed -i '' 's|from ['"'"'"][./]*lib/validators['"'"'"]|from '"'"'@/validation'"'"'|g' "$file"
    sed -i '' 's|from ['"'"'"]../../../lib/validators['"'"'"]|from '"'"'@/validation'"'"'|g' "$file"
    sed -i '' 's|from ['"'"'"]../../../../lib/validators['"'"'"]|from '"'"'@/validation'"'"'|g' "$file"
    sed -i '' 's|from ['"'"'"]../../../../../lib/validators['"'"'"]|from '"'"'@/validation'"'"'|g' "$file"

    # Update task-types imports to use validation
    sed -i '' 's|from ['"'"'"][./]*lib/task-types['"'"'"]|from '"'"'@/validation'"'"'|g' "$file"
    sed -i '' 's|from ['"'"'"]../../../lib/task-types['"'"'"]|from '"'"'@/validation'"'"'|g' "$file"
    sed -i '' 's|from ['"'"'"]../../../../lib/task-types['"'"'"]|from '"'"'@/validation'"'"'|g' "$file"
    sed -i '' 's|from ['"'"'"]../../../../../lib/task-types['"'"'"]|from '"'"'@/validation'"'"'|g' "$file"

    # Update other lib imports to use @/lib
    sed -i '' 's|from ['"'"'"]../../../lib/|from '"'"'@/lib/|g' "$file"
    sed -i '' 's|from ['"'"'"]../../../../lib/|from '"'"'@/lib/|g' "$file"
    sed -i '' 's|from ['"'"'"]../../../../../lib/|from '"'"'@/lib/|g' "$file"
done

echo "Import path updates completed!"