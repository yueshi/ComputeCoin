const API_BASE = '/api';
let currentNetwork = null;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    loadNetworkInfo();
    loadLatestBlocks();
    loadLatestTransactions();
    loadTokenInfo(); // 添加加载代币信息
    
    // 绑定重新加载合约按钮事件
    const reloadButton = document.getElementById('reload-deployments');
    if (reloadButton) {
        reloadButton.addEventListener('click', reloadDeployments);
    }
    
    // 每30秒刷新一次数据
    setInterval(() => {
        loadNetworkInfo();
        loadLatestBlocks();
        loadLatestTransactions();
        loadTokenInfo(); // 刷新代币信息
    }, 30000);
});

// 加载网络信息
async function loadNetworkInfo() {
    try {
        // 获取基础网络信息
        const networkResponse = await fetch(`${API_BASE}/network`);
        const networkData = await networkResponse.json();
        currentNetwork = networkData;
        
        document.getElementById('current-block').textContent = networkData.blockNumber.toLocaleString();
        document.getElementById('gas-price').textContent = `${(parseInt(networkData.gasPrice.gasPrice) / 1e9).toFixed(2)} gwei`;
        document.getElementById('chain-id').textContent = networkData.chainId;
        
        // 获取准确的交易统计信息
        try {
            const statsResponse = await fetch(`${API_BASE}/stats/transactions`);
            const statsData = await statsResponse.json();
            document.getElementById('total-txs').textContent = statsData.totalTransactions.toLocaleString();
        } catch (statsError) {
            console.warn('Failed to load transaction stats, falling back to estimation:', statsError);
            // 回退到估算逻辑
            const estimatedTxs = networkData.blockNumber * 1; // 基于实际的平均每区块1笔交易
            document.getElementById('total-txs').textContent = estimatedTxs.toLocaleString();
        }
        
    } catch (error) {
        console.error('Error loading network info:', error);
    }
}

// 加载最新区块
async function loadLatestBlocks() {
    try {
        const response = await fetch(`${API_BASE}/blocks?limit=5`);
        const blocks = await response.json();
        
        const loadingDiv = document.getElementById('blocks-loading');
        const listDiv = document.getElementById('blocks-list');
        
        loadingDiv.style.display = 'none';
        listDiv.innerHTML = '';
        
        blocks.forEach(block => {
            const blockElement = createBlockElement(block);
            listDiv.appendChild(blockElement);
        });
        
    } catch (error) {
        console.error('Error loading blocks:', error);
    }
}

// 加载最新交易
async function loadLatestTransactions() {
    try {
        const response = await fetch(`${API_BASE}/transactions?limit=5`);
        const transactions = await response.json();
        
        const loadingDiv = document.getElementById('transactions-loading');
        const listDiv = document.getElementById('transactions-list');
        
        loadingDiv.style.display = 'none';
        listDiv.innerHTML = '';
        
        transactions.forEach(tx => {
            const txElement = createTransactionElement(tx);
            listDiv.appendChild(txElement);
        });
        
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

// 创建区块元素
function createBlockElement(block) {
    const div = document.createElement('div');
    div.className = 'border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer';
    div.onclick = () => showBlockDetails(block);
    
    div.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <span class="text-blue-600 font-semibold">区块 #${block.number}</span>
            <span class="text-gray-500 text-sm">${formatTimestamp(block.timestamp)}</span>
        </div>
        <div class="text-sm text-gray-600 space-y-1">
            <div class="flex justify-between">
                <span>哈希:</span>
                <span class="hash-text text-xs">${formatHash(block.hash)}</span>
            </div>
            <div class="flex justify-between">
                <span>交易数:</span>
                <span>${block.transactions}</span>
            </div>
            <div class="flex justify-between">
                <span>矿工:</span>
                <span class="hash-text text-xs">${formatHash(block.miner)}</span>
            </div>
        </div>
    `;
    
    return div;
}

// 创建交易元素
function createTransactionElement(tx) {
    const div = document.createElement('div');
    div.className = 'border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer';
    div.onclick = () => showTransactionDetails(tx);
    
    div.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <span class="text-green-600 font-semibold">交易</span>
            <span class="text-gray-500 text-sm">#${tx.blockNumber}</span>
        </div>
        <div class="text-sm text-gray-600 space-y-1">
            <div class="flex justify-between">
                <span>哈希:</span>
                <span class="hash-text text-xs">${formatHash(tx.hash)}</span>
            </div>
            <div class="flex justify-between">
                <span>从:</span>
                <span class="hash-text text-xs">${formatHash(tx.from)}</span>
            </div>
            ${tx.to ? `
            <div class="flex justify-between">
                <span>到:</span>
                <span class="hash-text text-xs">${formatHash(tx.to)}</span>
            </div>
            ` : ''}
            <div class="flex justify-between">
                <span>价值:</span>
                <span>${formatValue(tx.value)} ETH</span>
            </div>
        </div>
    `;
    
    return div;
}

// 搜索功能
async function performSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;
    
    try {
        const response = await fetch(`${API_BASE}/search/${query}`);
        const result = await response.json();
        
        if (response.ok) {
            showSearchResults(result);
        } else {
            alert('未找到相关结果');
        }
    } catch (error) {
        console.error('Search error:', error);
        alert('搜索失败');
    }
}

// 显示搜索结果
function showSearchResults(result) {
    const resultsDiv = document.getElementById('search-results');
    const contentDiv = document.getElementById('search-content');
    
    resultsDiv.classList.remove('hidden');
    
    switch (result.type) {
        case 'block':
            loadAndShowBlock(result.data);
            break;
        case 'transaction':
            loadAndShowTransaction(result.data);
            break;
        case 'address':
        case 'contract':
            loadAndShowAddress(result.data);
            break;
    }
}

// 加载并显示区块详情
async function loadAndShowBlock(blockNumber) {
    try {
        const response = await fetch(`${API_BASE}/block/${blockNumber}`);
        const block = await response.json();
        showModal('区块详情', createBlockDetailsHTML(block));
    } catch (error) {
        console.error('Error loading block details:', error);
    }
}

// 加载并显示交易详情
async function loadAndShowTransaction(hash) {
    try {
        const response = await fetch(`${API_BASE}/transaction/${hash}`);
        const tx = await response.json();
        showModal('交易详情', createTransactionDetailsHTML(tx));
    } catch (error) {
        console.error('Error loading transaction details:', error);
    }
}

// 加载并显示地址详情
async function loadAndShowAddress(address) {
    try {
        const response = await fetch(`${API_BASE}/address/${address}`);
        const data = await response.json();
        
        // 如果是合约地址，同时获取合约信息
        if (data.isContract) {
            try {
                const contractResponse = await fetch(`${API_BASE}/contract/${address}/info`);
                const contractData = await contractResponse.json();
                data.contractInfo = contractData;
            } catch (contractError) {
                console.error('Error loading contract info:', contractError);
            }
        }
        
        showModal('地址详情', createAddressDetailsHTML(data));
    } catch (error) {
        console.error('Error loading address details:', error);
    }
}

// 显示区块详情
function showBlockDetails(block) {
    loadAndShowBlock(block.number);
}

// 显示交易详情
function showTransactionDetails(tx) {
    loadAndShowTransaction(tx.hash);
}

// 创建区块详情HTML
function createBlockDetailsHTML(block) {
    return `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="text-sm font-medium text-gray-500">区块号</label>
                    <p class="text-lg font-semibold">${block.number}</p>
                </div>
                <div>
                    <label class="text-sm font-medium text-gray-500">时间戳</label>
                    <p>${formatTimestamp(block.timestamp)}</p>
                </div>
            </div>
            <div>
                <label class="text-sm font-medium text-gray-500">区块哈希</label>
                <p class="hash-text text-sm bg-gray-100 p-2 rounded">${block.hash}</p>
            </div>
            <div>
                <label class="text-sm font-medium text-gray-500">父区块哈希</label>
                <p class="hash-text text-sm bg-gray-100 p-2 rounded">${block.parentHash}</p>
            </div>
            <div>
                <label class="text-sm font-medium text-gray-500">矿工</label>
                <p class="hash-text text-sm bg-gray-100 p-2 rounded">${block.miner}</p>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="text-sm font-medium text-gray-500">交易数</label>
                    <p>${block.transactions.length}</p>
                </div>
                <div>
                    <label class="text-sm font-medium text-gray-500">Gas使用/限制</label>
                    <p>${block.gasUsed} / ${block.gasLimit}</p>
                </div>
            </div>
            ${block.transactions.length > 0 ? `
            <div>
                <label class="text-sm font-medium text-gray-500">交易列表</label>
                <div class="space-y-2 mt-2">
                    ${block.transactions.map(tx => `
                        <div class="border border-gray-200 rounded p-2 cursor-pointer hover:bg-gray-50" onclick="loadAndShowTransaction('${tx.hash}')">
                            <div class="flex justify-between text-sm">
                                <span class="hash-text">${formatHash(tx.hash)}</span>
                                <span>${formatValue(tx.value)} ETH</span>
                            </div>
                            <div class="text-xs text-gray-500 mt-1">
                                从: ${formatHash(tx.from)} → 到: ${formatHash(tx.to || '合约创建')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </div>
    `;
}

// 创建交易详情HTML
function createTransactionDetailsHTML(tx) {
    return `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="text-sm font-medium text-gray-500">区块号</label>
                    <p>${tx.blockNumber}</p>
                </div>
                <div>
                    <label class="text-sm font-medium text-gray-500">状态</label>
                    <p class="${tx.status === 1 ? 'text-green-600' : 'text-red-600'}">
                        ${tx.status === 1 ? '成功' : tx.status === 0 ? '失败' : '待定'}
                    </p>
                </div>
            </div>
            <div>
                <label class="text-sm font-medium text-gray-500">交易哈希</label>
                <p class="hash-text text-sm bg-gray-100 p-2 rounded">${tx.hash}</p>
            </div>
            <div>
                <label class="text-sm font-medium text-gray-500">从</label>
                <p class="hash-text text-sm bg-gray-100 p-2 rounded cursor-pointer" onclick="loadAndShowAddress('${tx.from}')">${tx.from}</p>
            </div>
            ${tx.to ? `
            <div>
                <label class="text-sm font-medium text-gray-500">到</label>
                <p class="hash-text text-sm bg-gray-100 p-2 rounded cursor-pointer" onclick="loadAndShowAddress('${tx.to}')">${tx.to}</p>
            </div>
            ` : ''}
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="text-sm font-medium text-gray-500">价值</label>
                    <p>${formatValue(tx.value)} ETH</p>
                </div>
                <div>
                    <label class="text-sm font-medium text-gray-500">Nonce</label>
                    <p>${tx.nonce}</p>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="text-sm font-medium text-gray-500">Gas价格</label>
                    <p>${formatValue(tx.gasPrice)} ETH</p>
                </div>
                <div>
                    <label class="text-sm font-medium text-gray-500">Gas限制/使用</label>
                    <p>${tx.gasLimit}${tx.gasUsed ? ` / ${tx.gasUsed}` : ''}</p>
                </div>
            </div>
            ${tx.data && tx.data !== '0x' ? `
            <div>
                <label class="text-sm font-medium text-gray-500">输入数据</label>
                <textarea class="w-full text-sm bg-gray-100 p-2 rounded" rows="3" readonly>${tx.data}</textarea>
            </div>
            ` : ''}
        </div>
    `;
}

// 加载代币和NFT信息
async function loadTokenInfo() {
    try {
        const response = await fetch(`${API_BASE}/stats/tokens`);
        const data = await response.json();
        
        const loadingDiv = document.getElementById('tokens-loading');
        const listDiv = document.getElementById('tokens-list');
        
        loadingDiv.style.display = 'none';
        listDiv.innerHTML = '';
        
        if (data.tokens && data.tokens.length > 0) {
            data.tokens.forEach(token => {
                const tokenElement = createTokenElement(token);
                listDiv.appendChild(tokenElement);
            });
        } else {
            listDiv.innerHTML = '<div class="text-gray-500 text-center">暂无代币信息</div>';
        }
        
    } catch (error) {
        console.error('Error loading token info:', error);
        const loadingDiv = document.getElementById('tokens-loading');
        const listDiv = document.getElementById('tokens-list');
        loadingDiv.style.display = 'none';
        listDiv.innerHTML = '<div class="text-red-500 text-center">加载代币信息失败</div>';
    }
}

// 创建代币元素
function createTokenElement(token) {
    const div = document.createElement('div');
    div.className = 'border border-gray-200 rounded-lg p-4 hover:bg-gray-50 token-card cursor-pointer';
    
    const tokenType = token.type === 'erc20' ? 'ERC-20 代币' : 'ERC-721 NFT';
    const icon = token.type === 'erc20' ? 'fas fa-coins' : 'fas fa-image';
    const iconColor = token.type === 'erc20' ? 'text-yellow-600' : 'text-purple-600';
    
    // CCToken统计信息展示
    const ccTokenStats = token.isCCToken ? `
        <div class="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <h5 class="font-semibold text-green-800 mb-2">CCToken 统计信息</h5>
            <div class="grid grid-cols-1 gap-2 text-sm">
                <div class="flex justify-between">
                    <span class="text-gray-600">总供应量:</span>
                    <span class="font-semibold text-gray-900">${token.formattedSupply}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">已售出:</span>
                    <span class="font-semibold text-blue-600">${token.formattedSoldTokens}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">剩余:</span>
                    <span class="font-semibold text-orange-600">${token.formattedRemainingTokens}</span>
                </div>
            </div>
        </div>
    ` : '';
    
    div.innerHTML = `
        <div class="flex items-center mb-3">
            <div class="p-2 rounded-full bg-gray-100">
                <i class="${icon} ${iconColor}"></i>
            </div>
            <div class="ml-3">
                <h4 class="font-semibold text-gray-900">${token.name || '未知代币'}</h4>
                <p class="text-sm text-gray-600">${token.symbol || 'N/A'} • ${tokenType}</p>
            </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
                <label class="text-gray-500">总供应量</label>
                <p class="font-semibold text-gray-900">${token.formattedSupply}</p>
            </div>
            <div>
                <label class="text-gray-500">精度</label>
                <p class="font-semibold text-gray-900">${token.decimals} 位小数</p>
            </div>
        </div>
        
        ${ccTokenStats}
        
        <div class="mt-3 pt-3 border-t border-gray-200">
            <p class="text-xs text-gray-500 font-mono">${token.address}</p>
        </div>
    `;
    
    return div;
}

// 创建地址详情HTML
function createAddressDetailsHTML(data) {
    let contractInfoHTML = '';
    
    // 如果有合约信息，添加到HTML中
    if (data.contractInfo) {
        const contract = data.contractInfo;
        
        if (contract.isToken || contract.isNFT) {
            contractInfoHTML = `
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 class="text-lg font-semibold text-blue-800 mb-3">合约信息</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-sm font-medium text-gray-500">合约名称</label>
                            <p class="font-semibold">${contract.name || '未知'}</p>
                        </div>
                        <div>
                            <label class="text-sm font-medium text-gray-500">代币符号</label>
                            <p class="font-semibold">${contract.symbol || 'N/A'}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 mt-2">
                        <div>
                            <label class="text-sm font-medium text-gray-500">总供应量</label>
                            <p class="font-semibold">
                                ${contract.totalSupply ? formatTokenAmount(contract.totalSupply, contract.decimals) : 'N/A'}
                                ${contract.symbol || ''}
                            </p>
                        </div>
                        <div>
                            <label class="text-sm font-medium text-gray-500">合约类型</label>
                            <p class="font-semibold">
                                ${contract.isToken ? 'ERC-20 代币' : contract.isNFT ? 'ERC-721 NFT' : '智能合约'}
                            </p>
                        </div>
                    </div>
                    ${contract.decimals ? `
                    <div class="mt-2">
                        <label class="text-sm font-medium text-gray-500">精度</label>
                        <p class="font-semibold">${contract.decimals} 位小数</p>
                    </div>
                    ` : ''}
                </div>
            `;
        } else {
            contractInfoHTML = `
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                    <h4 class="text-lg font-semibold text-gray-800 mb-2">合约信息</h4>
                    <p class="text-sm text-gray-600">这是一个智能合约，但无法识别其具体类型</p>
                    <p class="text-sm text-gray-500 mt-1">类型: ${contract.type}</p>
                </div>
            `;
        }
    }
    
    return `
        <div class="space-y-4">
            <div>
                <label class="text-sm font-medium text-gray-500">地址</label>
                <p class="hash-text text-sm bg-gray-100 p-2 rounded">${data.address}</p>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="text-sm font-medium text-gray-500">余额</label>
                    <p class="text-lg font-semibold">${formatValue(data.balance)} ETH</p>
                </div>
                <div>
                    <label class="text-sm font-medium text-gray-500">交易数</label>
                    <p>${data.transactionCount}</p>
                </div>
            </div>
            <div>
                <label class="text-sm font-medium text-gray-500">类型</label>
                <p class="${data.isContract ? 'text-purple-600' : 'text-gray-600'}">
                    ${data.isContract ? '智能合约' : '外部账户'}
                </p>
            </div>
            
            ${contractInfoHTML}
            
            ${data.code ? `
            <div>
                <label class="text-sm font-medium text-gray-500">字节码</label>
                <textarea class="w-full text-xs bg-gray-100 p-2 rounded" rows="4" readonly>${data.code}</textarea>
            </div>
            ` : ''}
        </div>
    `;
}

// 显示模态框
function showModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-content').innerHTML = content;
    document.getElementById('modal').classList.remove('hidden');
    document.getElementById('modal').classList.add('flex');
}

// 关闭模态框
function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    document.getElementById('modal').classList.remove('flex');
}

// 辅助函数
function formatHash(hash) {
    if (!hash) return '';
    return hash.slice(0, 6) + '...' + hash.slice(-4);
}

function formatValue(value) {
    if (!value) return '0';
    return (parseInt(value) / 1e18).toFixed(6);
}

function formatTokenAmount(amount, decimals = 18) {
    if (!amount) return '0';
    const divisor = Math.pow(10, decimals);
    return (parseInt(amount) / divisor).toLocaleString(undefined, {
        maximumFractionDigits: decimals > 6 ? 6 : decimals
    });
}

function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
}

// 搜索框回车事件
document.getElementById('search-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        performSearch();
    }
});

// 模态框外部点击关闭
document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

// 重新加载hardhat-deploy合约
async function reloadDeployments() {
    const button = document.getElementById('reload-deployments');
    const originalText = button.innerHTML;
    
    try {
        // 显示加载状态
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Reloading...';
        button.disabled = true;
        
        console.log('🔄 Reloading hardhat-deploy contracts...');
        
        // 调用API重新加载部署
        const response = await fetch(`${API_BASE}/deployments/reload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log(`✅ Reloaded ${result.contracts.length} contracts`);
            
            // 显示成功消息
            showNotification(`✅ Reloaded ${result.contracts.length} contracts from hardhat-deploy`, 'success');
            
            // 重新加载代币信息
            loadTokenInfo();
        } else {
            throw new Error(result.error || 'Failed to reload deployments');
        }
        
    } catch (error) {
        console.error('❌ Error reloading deployments:', error);
        showNotification(`❌ Error: ${error.message}`, 'error');
    } finally {
        // 恢复按钮状态
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// 显示通知消息
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all transform translate-x-full`;
    
    // 设置样式
    if (type === 'success') {
        notification.classList.add('bg-green-500', 'text-white');
    } else if (type === 'error') {
        notification.classList.add('bg-red-500', 'text-white');
    } else {
        notification.classList.add('bg-blue-500', 'text-white');
    }
    
    notification.innerHTML = `
        <div class="flex items-center">
            <span>${message}</span>
            <button class="ml-4 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}