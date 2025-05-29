// 🎯 Google Meet 按钮调试脚本
// 直接复制到浏览器控制台运行

console.log('🔍 开始分析Google Meet按钮...');

// 1. 查找所有可能的按钮
function findAllButtons() {
    const allButtons = document.querySelectorAll([
        'div[role="button"]',
        'button',
        '[jscontroller]',
        '[data-testid]'
    ].join(','));

    console.log(`总共找到 ${allButtons.length} 个可点击元素`);
    return allButtons;
}

// 2. 过滤媒体控制按钮
function findMediaButtons() {
    const allButtons = findAllButtons();

    const mediaButtons = Array.from(allButtons).filter(btn => {
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
        const title = (btn.getAttribute('title') || '').toLowerCase();
        const testId = (btn.getAttribute('data-testid') || '').toLowerCase();

        return (
            ariaLabel.includes('mic') ||
            ariaLabel.includes('camera') ||
            ariaLabel.includes('麦克风') ||
            ariaLabel.includes('摄像头') ||
            ariaLabel.includes('microphone') ||
            title.includes('mic') ||
            title.includes('camera') ||
            testId.includes('mic') ||
            testId.includes('camera')
        );
    });

    console.log(`找到 ${mediaButtons.length} 个媒体控制按钮:`);

    mediaButtons.forEach((btn, index) => {
        console.log(`\n📱 按钮 ${index + 1}:`);
        console.log('  元素:', btn);
        console.log('  aria-label:', btn.getAttribute('aria-label'));
        console.log('  data-testid:', btn.getAttribute('data-testid'));
        console.log('  title:', btn.getAttribute('title'));
        console.log('  jsname:', btn.getAttribute('jsname'));
        console.log('  className:', btn.className);
    });

    return mediaButtons;
}

// 3. 测试点击功能
function testClick(element, elementName = '未知按钮') {
    console.log(`\n🧪 测试点击: ${elementName}`);

    const beforeLabel = element.getAttribute('aria-label');
    const beforePressed = element.getAttribute('aria-pressed');

    console.log('  点击前状态:', { ariaLabel: beforeLabel, ariaPressed: beforePressed });

    // 尝试多种点击方式
    try {
        // 方式1: 普通点击
        element.click();
        console.log('  ✓ 执行了 element.click()');

        // 等待一下，检查状态变化
        setTimeout(() => {
            const afterLabel = element.getAttribute('aria-label');
            const afterPressed = element.getAttribute('aria-pressed');

            console.log('  点击后状态:', { ariaLabel: afterLabel, ariaPressed: afterPressed });

            if (beforeLabel !== afterLabel || beforePressed !== afterPressed) {
                console.log('  ✅ 点击成功！状态已改变');
            } else {
                console.log('  ❌ 点击可能无效，尝试其他方式...');

                // 方式2: 鼠标事件
                const mouseEvent = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: element.offsetLeft + element.offsetWidth/2,
                    clientY: element.offsetTop + element.offsetHeight/2
                });
                element.dispatchEvent(mouseEvent);
                console.log('  ✓ 尝试了鼠标事件');

                // 方式3: 焦点+回车
                element.focus();
                const keyEvent = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    bubbles: true
                });
                element.dispatchEvent(keyEvent);
                console.log('  ✓ 尝试了键盘事件');
            }
        }, 500);

    } catch (error) {
        console.log('  ❌ 点击失败:', error);
    }
}

// 4. 快速测试函数
function quickTest() {
    console.log('\n🚀 开始快速测试...');

    const mediaButtons = findMediaButtons();

    if (mediaButtons.length === 0) {
        console.log('❌ 没有找到媒体控制按钮，可能需要先加入会议');
        return;
    }

    // 测试每个找到的按钮
    mediaButtons.forEach((btn, index) => {
        const ariaLabel = btn.getAttribute('aria-label') || `按钮${index + 1}`;
        testClick(btn, ariaLabel);
    });
}

// 5. 键盘快捷键测试
function testKeyboardShortcuts() {
    console.log('\n⌨️ 测试Google Meet键盘快捷键...');

    // Google Meet的快捷键
    const shortcuts = [
        { key: 'd', ctrl: true, desc: '切换麦克风' },
        { key: 'e', ctrl: true, desc: '切换摄像头' }
    ];

    shortcuts.forEach(shortcut => {
        console.log(`尝试快捷键: Ctrl+${shortcut.key.toUpperCase()} (${shortcut.desc})`);

        const keyEvent = new KeyboardEvent('keydown', {
            key: shortcut.key,
            code: `Key${shortcut.key.toUpperCase()}`,
            ctrlKey: shortcut.ctrl,
            bubbles: true
        });

        document.dispatchEvent(keyEvent);
    });
}

// 6. 主函数
function debugGoogleMeet() {
    console.log('🎥 Google Meet 调试工具启动');
    console.log('=====================================');

    quickTest();

    setTimeout(() => {
        console.log('\n⌨️ 如果按钮点击无效，尝试键盘快捷键...');
        testKeyboardShortcuts();
    }, 2000);
}

// 添加到全局作用域
window.debugGoogleMeet = debugGoogleMeet;
window.testClick = testClick;
window.findMediaButtons = findMediaButtons;

// 自动运行
debugGoogleMeet();

console.log('\n💡 使用说明:');
console.log('1. debugGoogleMeet() - 完整调试');
console.log('2. findMediaButtons() - 只查找按钮');
console.log('3. testClick(element, name) - 测试点击特定按钮');