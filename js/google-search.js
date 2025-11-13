// google-search.js - 连接到 Google 搜索

(() => {
    function onReady(fn) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
        else fn();
    }

    onReady(() => {
        // 获取所有搜索表单
        const searchForms = document.querySelectorAll('.search');
        
        searchForms.forEach(form => {
            const searchInput = form.querySelector('input[type="search"]');
            const searchButton = form.querySelector('button[type="submit"]');

            if (!searchInput || !searchButton) return;

            // 搜索函数
            function performGoogleSearch(e) {
                e.preventDefault();
                
                const query = searchInput.value.trim();
                
                if (!query) {
                    // 如果没有输入内容，显示提示
                    searchInput.focus();
                    searchInput.style.borderColor = '#ff6b6b';
                    searchInput.placeholder = 'Please enter search keywords!';
                    
                    setTimeout(() => {
                        searchInput.style.borderColor = '';
                        searchInput.placeholder = 'Search...';
                    }, 2000);
                    return;
                }

                // 自动添加 "Kuromi" 到搜索词（可选）
                const fullQuery = query;
                
                // 跳转到 Google 搜索
                // 使用 encodeURIComponent 确保特殊字符正确编码
                const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(fullQuery)}`;
                
                // 在新标签页打开
                window.open(googleSearchUrl, '_blank');
                
                // 清空搜索框（可选）
                // searchInput.value = '';
            }

            // 绑定表单提交事件
            form.addEventListener('submit', performGoogleSearch);
            
            // 绑定按钮点击事件
            searchButton.addEventListener('click', performGoogleSearch);

            // 绑定 Enter 键
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    performGoogleSearch(e);
                }
            });
        });
    });
})();
