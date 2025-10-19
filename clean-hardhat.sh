#!/bin/bash

echo "🧹 开始清理Hardhat缓存文件..."

# 当前工作目录
PROJECT_DIR=$(pwd)

echo "📍 项目目录: $PROJECT_DIR"

# 需要清理的目录列表
DIRS_TO_CLEAN=(
    "cache"
    "artifacts"
    "deployments"
)

echo ""
echo "🗂️  将清理以下目录:"
for dir in "${DIRS_TO_CLEAN[@]}"; do
    echo "  - $dir"
done

echo ""
echo "⚠️  注意: 由于权限问题，某些文件可能需要手动删除"
echo ""

# 清理每个目录
for dir in "${DIRS_TO_CLEAN[@]}"; do
    if [ -d "$dir" ]; then
        echo "🗑️  正在清理: $dir"

        # 尝试删除目录内容
        find "$dir" -type f -delete 2>/dev/null || true

        # 尝试删除空目录
        find "$dir" -type d -empty -delete 2>/dev/null || true

        # 如果目录仍然存在，说明有权限问题
        if [ -d "$dir" ]; then
            echo "  ⚠️  $dir 中的某些文件需要手动删除（权限问题）"
            echo "     可以尝试运行: sudo rm -rf $dir"
        else
            echo "  ✅ $dir 已成功删除"
        fi
    else
        echo "  ℹ️  $dir 不存在，跳过"
    fi
done

echo ""
echo "🔍 查找其他Hardhat相关文件..."

# 查找其他可能的缓存文件
OTHER_FILES=(
    "typechain-types"
    "*.lock"
    ".hardhat_cache"
)

for pattern in "${OTHER_FILES[@]}"; do
    if ls $pattern 1> /dev/null 2>&1; then
        echo "🗑️  发现: $pattern"
        rm -rf $pattern 2>/dev/null || echo "  ⚠️  需要手动删除: $pattern"
    fi
done

echo ""
echo "📝 清理完成！建议手动运行以下命令来处理权限问题："
echo ""
echo "sudo rm -rf cache artifacts deployments"
echo ""
echo "然后重新运行:"
echo "npm run compile"
echo ""

echo "✨ Hardhat缓存清理脚本执行完成！"