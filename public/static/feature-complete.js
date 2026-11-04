(function () {
  'use strict';

  const KEYS = {
    memories: 'memorylink_local_memories',
    folders: 'memorylink_custom_folders',
    transfers: 'memorylink_transfer_plans',
    googleClientId: 'memorylink_google_client_id',
    user: 'memorylink_local_user'
  };

  const GOOGLE_WEB_CLIENT_ID = '647175100510-q06nfffg5j7vmjdigtv9qu07oevdt9df.apps.googleusercontent.com';

  const CATEGORY_RULES = [
    { id: 1, name: '사진', words: ['사진', '가족', '여행', '풍경', '앨범', '졸업', '결혼', '반려동물'], types: ['image/'] },
    { id: 2, name: '동영상', words: ['영상', '동영상', '촬영', '클립'], types: ['video/'] },
    { id: 3, name: '문서', words: ['문서', '계약', '증명', '편지', '기록', '일기', 'pdf', '보고서'], types: ['application/pdf', 'text/', 'application/msword', 'officedocument'] },
    { id: 4, name: 'SNS 게시물', words: ['sns', '게시물', '인스타', '페이스북', '블로그', '댓글', '채팅', '메시지'], types: [] },
    { id: 5, name: '이메일', words: ['이메일', '메일', '수신', '발신', '@'], types: ['message/'] },
    { id: 6, name: '음성', words: ['음성', '목소리', '녹음', '통화', '오디오'], types: ['audio/'] }
  ];

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value == null ? fallback : value;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function memories() {
    return readJson(KEYS.memories, []);
  }

  function saveMemories(items) {
    writeJson(KEYS.memories, items);
  }

  function folders() {
    return readJson(KEYS.folders, []);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function normalize(value) {
    return String(value || '').toLowerCase().replace(/[^0-9a-z가-힣]+/g, ' ').trim();
  }

  function tokens(value) {
    return new Set(normalize(value).split(/\s+/).filter(function (word) { return word.length > 1; }));
  }

  function jaccard(a, b) {
    const left = tokens(a);
    const right = tokens(b);
    const union = new Set(Array.from(left).concat(Array.from(right)));
    if (!union.size) return 0;
    let intersection = 0;
    left.forEach(function (word) { if (right.has(word)) intersection += 1; });
    return intersection / union.size;
  }

  function classifyMemory(memory) {
    const text = normalize([memory.title, memory.description, memory.content, memory.file_name, memory.tags].flat().join(' '));
    const type = String(memory.file_type || '').toLowerCase();
    let best = { id: Number(memory.category_id) || 3, name: '문서', score: memory.category_id ? 2 : 0 };
    CATEGORY_RULES.forEach(function (rule) {
      let score = 0;
      rule.words.forEach(function (word) { if (text.includes(word)) score += word.length > 2 ? 3 : 2; });
      rule.types.forEach(function (prefix) { if (type.includes(prefix)) score += 6; });
      if (score > best.score) best = { id: rule.id, name: rule.name, score: score };
    });
    return best;
  }

  function calculateImportance(memory) {
    const text = normalize([memory.title, memory.description, memory.content, memory.ai_summary].join(' '));
    let score = 4;
    ['가족', '부모', '할머니', '할아버지', '자녀', '결혼', '졸업', '탄생', '첫', '마지막', '유언', '편지'].forEach(function (word) {
      if (text.includes(word)) score += 1;
    });
    ['소중', '사랑', '감사', '행복', '추억', '기념'].forEach(function (word) {
      if (text.includes(word)) score += 0.5;
    });
    if (memory.file_url) score += 0.5;
    if (memory.original_date) score += 0.5;
    if (String(memory.ai_sentiment) === 'positive') score += 0.5;
    return Math.max(1, Math.min(10, Math.round(score)));
  }

  function recommendedFolder(memory, category) {
    const text = normalize([memory.title, memory.description, memory.content].join(' '));
    if (text.includes('가족') || text.includes('부모') || text.includes('할머니') || text.includes('할아버지')) return '가족의 기록';
    if (text.includes('여행') || text.includes('제주') || text.includes('바다')) return '여행 아카이브';
    if (text.includes('계약') || text.includes('증명') || text.includes('문서')) return '중요 문서';
    if (text.includes('학교') || text.includes('졸업') || text.includes('프로젝트')) return '성장과 성취';
    if (category.name === '음성') return '목소리 기록';
    return category.name;
  }

  function cleanupReason(memory, duplicateGroup) {
    if (duplicateGroup) return '중복·유사 자료로 확인됨';
    if (Number(memory.importance_score || 0) <= 3) return '중요도가 낮아 정리 검토가 필요함';
    if (!memory.file_url && !normalize(memory.content || memory.description)) return '내용과 첨부 파일이 없어 정리 검토가 필요함';
    return '';
  }

  function duplicateGroups(items) {
    const groups = [];
    const used = new Set();
    items.forEach(function (item, index) {
      if (used.has(String(item.id))) return;
      const matches = [item];
      for (let cursor = index + 1; cursor < items.length; cursor += 1) {
        const other = items[cursor];
        const sameHash = item.file_hash && other.file_hash && item.file_hash === other.file_hash;
        const sameName = item.file_name && other.file_name && normalize(item.file_name) === normalize(other.file_name);
        const titleScore = jaccard(item.title, other.title);
        const contentScore = jaccard([item.title, item.description].join(' '), [other.title, other.description].join(' '));
        if (sameHash || sameName || titleScore >= 0.72 || contentScore >= 0.7) matches.push(other);
      }
      if (matches.length > 1) {
        matches.forEach(function (match) { used.add(String(match.id)); });
        groups.push(matches);
      }
    });
    return groups;
  }

  function enrichAllMemories() {
    const items = memories();
    const groups = duplicateGroups(items);
    const groupMap = new Map();
    groups.forEach(function (group, index) {
      group.forEach(function (item) { groupMap.set(String(item.id), 'DUP-' + (index + 1)); });
    });
    const next = items.map(function (item) {
      const category = classifyMemory(item);
      const analysis = typeof window.createLocalAIInsights === 'function' ? window.createLocalAIInsights(item) : {};
      const importance = item.importance_locked ? Number(item.importance_score) : calculateImportance(Object.assign({}, item, analysis));
      const duplicateGroup = groupMap.get(String(item.id)) || null;
      const folderName = item.folder_name || recommendedFolder(item, category);
      const reason = cleanupReason(Object.assign({}, item, { importance_score: importance }), duplicateGroup);
      const currentStatus = item.legacy_status || 'review';
      const autoStatus = currentStatus !== 'review' ? currentStatus : importance >= 8 ? 'preserve' : reason ? 'cleanup_suggested' : 'review';
      return Object.assign({}, item, analysis, {
        category_id: category.id,
        auto_category_name: category.name,
        folder_name: folderName,
        importance_score: importance,
        duplicate_group: duplicateGroup,
        cleanup_reason: reason,
        legacy_status: autoStatus,
        ai_organized_at: new Date().toISOString()
      });
    });
    saveMemories(next);
    syncSuggestedFolders(next);
    return next;
  }

  function syncSuggestedFolders(items) {
    const builtInNames = new Set(CATEGORY_RULES.map(function (category) { return category.name; }));
    const current = folders().filter(function (folder) { return folder && folder.name && !builtInNames.has(folder.name); });
    const map = new Map(current.map(function (folder) { return [folder.name, folder]; }));
    items.forEach(function (item) {
      if (!item.folder_name || builtInNames.has(item.folder_name) || map.has(item.folder_name)) return;
      const folder = { id: 'folder-' + Date.now() + '-' + map.size, name: item.folder_name, source: 'AI', created_at: new Date().toISOString() };
      map.set(folder.name, folder);
    });
    writeJson(KEYS.folders, Array.from(map.values()));
  }

  function refreshViews() {
    if (typeof window.renderLegacyWorkspace === 'function') window.renderLegacyWorkspace();
    if (typeof window.renderOrganizeView === 'function') window.renderOrganizeView();
    if (typeof window.loadMemories === 'function' && window.currentView === 'memories') window.loadMemories();
  }

  function setStatus(id, status) {
    saveMemories(memories().map(function (item) {
      return String(item.id) === String(id) ? Object.assign({}, item, { legacy_status: status, updated_at: new Date().toISOString() }) : item;
    }));
    refreshViews();
  }

  function ensureModal() {
    let modal = document.getElementById('feature-manager-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'feature-manager-modal';
    modal.className = 'feature-modal hidden';
    modal.innerHTML = '<div class="feature-modal-card"><div class="feature-modal-head"><div><span>MEMORYLINK MANAGER</span><h3 id="feature-modal-title">관리</h3></div><button type="button" onclick="closeFeatureManager()" aria-label="닫기"><i class="fas fa-times"></i></button></div><div id="feature-modal-body"></div></div>';
    document.body.appendChild(modal);
    return modal;
  }

  window.closeFeatureManager = function () {
    ensureModal().classList.add('hidden');
  };

  function showManager(title, html) {
    const modal = ensureModal();
    document.getElementById('feature-modal-title').textContent = title;
    document.getElementById('feature-modal-body').innerHTML = html;
    modal.classList.remove('hidden');
  }

  window.runAiOrganization = function () {
    const next = enrichAllMemories();
    refreshViews();
    const duplicates = duplicateGroups(next).length;
    const cleanup = next.filter(function (item) { return item.cleanup_reason; }).length;
    alert('AI 분석·자동 분류를 완료했습니다.\n자동 폴더 ' + folders().length + '개 · 중복 그룹 ' + duplicates + '개 · 정리 추천 ' + cleanup + '개');
  };

  window.createSuggestedFolder = function () {
    const next = enrichAllMemories();
    syncSuggestedFolders(next);
    window.openFolderManager();
  };

  window.openFolderManager = function () {
    const list = folders();
    const rows = list.length ? list.map(function (folder) {
      const count = memories().filter(function (item) { return item.folder_name === folder.name && item.legacy_status !== 'trash'; }).length;
      return '<div class="feature-folder-row"><i class="fas fa-folder"></i><div><strong>' + escapeHtml(folder.name) + '</strong><small>' + count + '개 자료 · ' + escapeHtml(folder.source || '직접 생성') + '</small></div><button onclick="renameFolder(\'' + escapeHtml(folder.id) + '\')">이름 변경</button><button class="danger" onclick="deleteFolder(\'' + escapeHtml(folder.id) + '\')">삭제</button></div>';
    }).join('') : '<div class="feature-empty">생성된 폴더가 없습니다.</div>';
    showManager('폴더 직접 관리', '<div class="feature-manager-actions"><button class="legacy-primary" onclick="createFolderManually()"><i class="fas fa-folder-plus"></i> 새 폴더</button><button onclick="runAiOrganization()"><i class="fas fa-wand-magic-sparkles"></i> AI 폴더 생성</button></div>' + rows + '<h4 class="feature-subtitle">자료 이동</h4>' + renderMoveRows());
  };

  function renderMoveRows() {
    const folderOptions = folders().map(function (folder) { return '<option value="' + escapeHtml(folder.name) + '">' + escapeHtml(folder.name) + '</option>'; }).join('');
    return memories().filter(function (item) { return item.legacy_status !== 'trash'; }).map(function (item) {
      return '<div class="feature-move-row"><div><strong>' + escapeHtml(item.title) + '</strong><small>현재: ' + escapeHtml(item.folder_name || '미분류') + '</small></div><select onchange="moveMemoryToFolder(' + Number(item.id) + ',this.value)"><option value="">이동할 폴더 선택</option>' + folderOptions + '</select></div>';
    }).join('') || '<div class="feature-empty">이동할 자료가 없습니다.</div>';
  }

  window.createFolderManually = function () {
    const name = prompt('새 폴더 이름을 입력하세요.');
    if (!name || !name.trim()) return;
    const list = folders();
    if (list.some(function (folder) { return normalize(folder.name) === normalize(name); })) return alert('같은 이름의 폴더가 있습니다.');
    list.push({ id: 'folder-' + Date.now(), name: name.trim(), source: '직접 생성', created_at: new Date().toISOString() });
    writeJson(KEYS.folders, list);
    window.openFolderManager();
    refreshViews();
  };

  window.renameFolder = function (id) {
    const list = folders();
    const folder = list.find(function (item) { return item.id === id; });
    if (!folder) return;
    const name = prompt('변경할 폴더 이름을 입력하세요.', folder.name);
    if (!name || !name.trim() || name.trim() === folder.name) return;
    const oldName = folder.name;
    folder.name = name.trim();
    writeJson(KEYS.folders, list);
    saveMemories(memories().map(function (item) { return item.folder_name === oldName ? Object.assign({}, item, { folder_name: folder.name }) : item; }));
    window.openFolderManager();
    refreshViews();
  };

  window.deleteFolder = function (id) {
    const list = folders();
    const folder = list.find(function (item) { return item.id === id; });
    if (!folder || !confirm('"' + folder.name + '" 폴더를 삭제할까요? 자료는 삭제되지 않고 미분류로 이동합니다.')) return;
    writeJson(KEYS.folders, list.filter(function (item) { return item.id !== id; }));
    saveMemories(memories().map(function (item) { return item.folder_name === folder.name ? Object.assign({}, item, { folder_name: '' }) : item; }));
    window.openFolderManager();
    refreshViews();
  };

  window.moveMemoryToFolder = function (id, folderName) {
    if (!folderName) return;
    saveMemories(memories().map(function (item) { return String(item.id) === String(id) ? Object.assign({}, item, { folder_name: folderName, updated_at: new Date().toISOString() }) : item; }));
    window.openFolderManager();
    refreshViews();
  };

  window.openDuplicateManager = function () {
    const groups = duplicateGroups(memories().filter(function (item) { return item.legacy_status !== 'trash'; }));
    const html = groups.length ? groups.map(function (group, index) {
      return '<section class="feature-duplicate-group"><h4>유사 그룹 ' + (index + 1) + '</h4>' + group.map(function (item, itemIndex) {
        return '<div><span><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.file_name || item.description || '파일 정보 없음') + '</small></span>' + (itemIndex ? '<button class="danger" onclick="markDuplicateForCleanup(' + Number(item.id) + ')">정리 대상으로 이동</button>' : '<em>대표 자료</em>') + '</div>';
      }).join('') + '</section>';
    }).join('') : '<div class="feature-empty">중복 또는 유사한 자료가 없습니다.</div>';
    showManager('중복·유사 자료 정리', html);
  };

  window.markDuplicateForCleanup = function (id) {
    setStatus(id, 'pending_delete');
    window.openDuplicateManager();
  };

  window.applyCleanupRecommendation = function (id, decision) {
    setStatus(id, decision === 'keep' ? 'hold' : 'pending_delete');
    window.renderOrganizeView();
  };

  const originalRenderOrganize = window.renderOrganizeView;
  window.renderOrganizeView = function () {
    if (typeof originalRenderOrganize === 'function') originalRenderOrganize();
    const root = document.getElementById('legacy-organize-content');
    if (!root) return;
    const items = memories().filter(function (item) { return item.legacy_status !== 'trash'; });
    const groups = duplicateGroups(items);
    const cleanup = items.filter(function (item) { return item.cleanup_reason || item.legacy_status === 'cleanup_suggested'; });
    const panel = document.createElement('section');
    panel.className = 'legacy-panel feature-ai-results';
    panel.innerHTML = '<div class="legacy-section-head"><div><span>AI ORGANIZATION RESULT</span><h3>자동 정리 결과</h3></div><button onclick="runAiOrganization()"><i class="fas fa-rotate"></i> 다시 분석</button></div><div class="feature-result-grid"><button onclick="openDuplicateManager()"><strong>' + groups.length + '</strong><span>중복·유사 그룹</span><small>파일 해시·이름·내용 유사도 비교</small></button><button onclick="openFolderManager()"><strong>' + folders().length + '</strong><span>자동·직접 폴더</span><small>폴더 생성·수정·삭제·자료 이동</small></button><div><strong>' + cleanup.length + '</strong><span>정리 추천</span><small>중복·낮은 중요도·빈 자료 분석</small></div></div><div class="feature-cleanup-list">' + (cleanup.length ? cleanup.map(function (item) { return '<article><div><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.cleanup_reason || '정리 검토가 필요한 자료') + '</small></div><button onclick="applyCleanupRecommendation(' + Number(item.id) + ',\'keep\')">보류</button><button class="danger" onclick="applyCleanupRecommendation(' + Number(item.id) + ',\'delete\')">삭제 예정</button></article>'; }).join('') : '<div class="feature-empty">현재 정리 추천 항목이 없습니다.</div>') + '</div>';
    root.prepend(panel);
  };

  function transferPackage(plan) {
    const selected = memories().filter(function (item) {
      if (plan.folder_name) return String(item.folder_name || '') === String(plan.folder_name);
      return item.legacy_status === 'transfer';
    });
    return {
      service: 'MemoryLink',
      generated_at: new Date().toISOString(),
      recipient: plan.recipient,
      contact: plan.contact,
      condition: plan.condition,
      message: plan.message,
      folder_name: plan.folder_name || '',
      memories: selected.map(function (item) {
        return { title: item.title, summary: item.ai_summary || item.description, date: item.original_date || item.created_at, folder: item.folder_name, file_url: item.file_url };
      })
    };
  }

  function transferFolderNames() {
    const names = folders().map(function (folder) { return String(folder.name || '').trim(); }).concat(memories().map(function (item) { return String(item.folder_name || '').trim(); })).filter(Boolean);
    return Array.from(new Set(names)).sort(function (a, b) { return a.localeCompare(b, 'ko'); });
  }

  function transferFolderLabel(name) {
    if (!name) return '전달 예정 자료 전체';
    const count = memories().filter(function (item) { return String(item.folder_name || '') === String(name); }).length;
    return name + ' · ' + count + '개 자료';
  }

  function transferFolderItems(name) {
    return memories().filter(function (item) { return String(item.folder_name || '') === String(name) && item.legacy_status !== 'trash'; });
  }

  function transferFolderContents(name, limit) {
    const items = transferFolderItems(name);
    if (!items.length) return '<div class="feature-folder-empty">폴더에 저장된 자료가 없습니다.</div>';
    const visible = items.slice(0, limit || 4).map(function (item) {
      const type = String(item.file_type || '').startsWith('image/') ? 'fa-image' : String(item.file_type || '').startsWith('video/') ? 'fa-video' : String(item.file_type || '').startsWith('audio/') ? 'fa-microphone' : 'fa-file-lines';
      return '<span><i class="fas ' + type + '"></i><b>' + escapeHtml(item.title || item.file_name || '이름 없는 자료') + '</b></span>';
    }).join('');
    const more = items.length > (limit || 4) ? '<em>외 ' + (items.length - (limit || 4)) + '개</em>' : '';
    return '<div class="feature-folder-contents">' + visible + more + '</div>';
  }

  window.openTransferFolderPicker = function () {
    const names = transferFolderNames();
    const html = names.length ? '<div class="feature-transfer-folder-grid">' + names.map(function (name) {
      const count = transferFolderItems(name).length;
      return '<button type="button" data-folder="' + escapeHtml(name) + '" onclick="chooseTransferFolder(this.dataset.folder)"><span class="feature-folder-title"><i class="fas fa-folder"></i><strong>' + escapeHtml(name) + '</strong><small>' + count + '개 자료</small></span>' + transferFolderContents(name, 4) + '</button>';
    }).join('') + '</div>' : '<div class="feature-empty"><i class="fas fa-folder-open"></i><p>선택할 폴더가 없습니다. 먼저 폴더를 만들어 주세요.</p></div>';
    showManager('전달할 폴더 선택', html);
  };

  window.chooseTransferFolder = function (name) {
    const input = document.querySelector('.legacy-form input[name="folder_name"]');
    const button = document.getElementById('transfer-folder-picker-button');
    if (!input || !button) return;
    input.value = name;
    button.classList.add('selected');
    const items = transferFolderItems(name);
    const preview = items.slice(0, 3).map(function (item) { return item.title || item.file_name || '이름 없는 자료'; }).join(', ');
    button.innerHTML = '<i class="fas fa-folder"></i><span><strong>' + escapeHtml(name) + '</strong><small>' + escapeHtml(items.length + '개 자료' + (preview ? ' · ' + preview : '')) + '</small></span><i class="fas fa-chevron-right"></i>';
    window.closeFeatureManager();
  };

  window.saveTransferPlan = function (event) {
    event.preventDefault();
    const form = event.target;
    if (!form.folder_name || !form.folder_name.value) return alert('전달할 폴더를 직접 선택해 주세요.');
    const email = form.contact.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert('수신인의 올바른 이메일 주소를 입력해 주세요.');
    const plans = readJson(KEYS.transfers, []);
    const sender = getTransferSender();
    plans.unshift({ id: Date.now(), recipient: form.recipient.value.trim(), contact: email, condition: form.condition.value, message: form.message.value.trim(), folder_name: form.folder_name ? form.folder_name.value : '', sender_id: sender.id, sender_name: sender.name, sender_email: sender.email, status: 'saved', created_at: new Date().toISOString() });
    writeJson(KEYS.transfers, plans);
    form.reset();
    window.renderTransferView();
    alert('전달 계획을 저장했습니다.');
  };

  window.deleteTransferPlan = function (id) {
    const plans = readJson(KEYS.transfers, []);
    const plan = plans.find(function (item) { return String(item.id) === String(id); });
    if (!plan || !confirm(plan.recipient + '님의 전달 계획을 삭제할까요?')) return;
    writeJson(KEYS.transfers, plans.filter(function (item) { return String(item.id) !== String(id); }));
    window.renderTransferView();
  };

  function transferMessage(plan) {
    const folderText = plan.folder_name ? '폴더: ' + plan.folder_name + '\n' : '전달 예정 자료 전체\n';
    const sender = getTransferSender(plan);
    const dateText = plan.scheduled_date ? '지정 전달일: ' + plan.scheduled_date + '\n' : '';
    return '[MemoryLink 디지털 유산 전달]\n보낸 사람: ' + sender.label + '\n' + plan.recipient + '님께 전달할 디지털 유산이 준비되었습니다.\n' + folderText + dateText + (plan.message ? plan.message + '\n' : '') + 'MemoryLink에서 본인 확인 후 안전하게 전달받아 주세요.';
  }

  function getTransferSender(plan) {
    const user = readJson(KEYS.user, {});
    const email = String((plan && plan.sender_email) || user.email || '').trim();
    const name = String((plan && plan.sender_name) || user.name || 'MemoryLink 사용자').trim();
    return { name: name, email: email, id: email || String(user.id || name), label: email ? name + ' (' + email + ')' : name };
  }

  function createClientTransferMessage(plan, items) {
    const sender = getTransferSender(plan);
    const titles = items.length ? items.slice(0, 12).map(function (item) { return '- ' + (item.title || '이름 없는 자료'); }).join('\n') : '- 선택한 폴더의 디지털 유산 자료';
    return [plan.recipient + '님께,', '', sender.label + '님이 MemoryLink에 보관한 \'' + plan.folder_name + '\' 폴더를 전달합니다.', plan.scheduled_date ? '지정 전달일: ' + plan.scheduled_date : '', plan.message ? '남긴 말: ' + plan.message : '', '', '포함된 기록:', titles, '', '소중한 기록을 안전하게 확인해 주세요.'].filter(Boolean).join('\n');
  }

  window.openTransferDatePicker = function (id) {
    const plan = readJson(KEYS.transfers, []).find(function (item) { return String(item.id) === String(id); });
    if (!plan) return;
    const today = new Date().toISOString().slice(0, 10);
    const selected = plan.scheduled_date || today;
    showManager('지정 전달일 선택', '<div class="feature-date-picker"><p><strong>' + escapeHtml(plan.recipient) + '</strong>님에게 전달할 날짜를 선택하세요.</p><label>전달 날짜<input id="transfer-scheduled-date" type="date" min="' + today + '" value="' + escapeHtml(selected) + '"></label><button type="button" class="legacy-primary" onclick="confirmTransferDate(' + Number(plan.id) + ')"><i class="fas fa-calendar-check"></i> 이 날짜로 전달</button></div>');
  };

  window.confirmTransferDate = function (id) {
    const input = document.getElementById('transfer-scheduled-date');
    if (!input || !input.value) return alert('전달 날짜를 선택해 주세요.');
    const plans = readJson(KEYS.transfers, []);
    const plan = plans.find(function (item) { return String(item.id) === String(id); });
    if (!plan) return;
    plan.scheduled_date = input.value;
    writeJson(KEYS.transfers, plans);
    window.closeFeatureManager();
    window.renderTransferView();
    window.aiDeliverTransfer(id, null);
  };

  window.sendTransferEmail = function (id) {
    const plan = readJson(KEYS.transfers, []).find(function (item) { return String(item.id) === String(id); });
    if (!plan) return;
    if (!plan.folder_name) return alert('전달할 폴더가 선택된 계획을 새로 저장해 주세요.');
    const email = String(plan.contact || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert('이 전달 계획에는 이메일이 없습니다. 삭제 후 이메일로 다시 등록해 주세요.');
    const subject = 'MemoryLink 디지털 유산 전달 - ' + (plan.folder_name || '전달 예정 자료');
    if (!confirm(email + ' 주소로 이메일 작성 화면을 열까요? 실제 발송은 메일 앱에서 최종 확인합니다.')) return;
    location.href = 'mailto:' + encodeURIComponent(email) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(transferMessage(plan));
  };

  window.sendTransferNow = function (id) {
    return window.sendTransferEmail(id);
  };

  window.aiDeliverTransfer = async function (id, button) {
    const plans = readJson(KEYS.transfers, []);
    const plan = plans.find(function (item) { return String(item.id) === String(id); });
    if (!plan || !plan.folder_name) return alert('전달할 폴더가 선택된 계획을 저장해 주세요.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(plan.contact || '').trim())) return alert('휴대폰 번호 전달 기능이 제거되었습니다. 이 계획을 삭제하고 수신인 이메일로 다시 등록해 주세요.');
    if (String(plan.condition || '').includes('지정일') && !plan.scheduled_date) return window.openTransferDatePicker(id);
    const sender = getTransferSender(plan);
    const scheduleText = plan.scheduled_date ? '\n지정 전달일: ' + plan.scheduled_date : '';
    if (!confirm(sender.label + ' 아이디로 ' + plan.contact + ' 수신인에게 AI 메시지를 발송할까요?' + scheduleText + '\n발송 서비스 이용료가 발생할 수 있습니다.')) return;
    if (button) { button.disabled = true; button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI 작성·발송 중'; }
    try {
      const folderItems = memories().filter(function (item) { return String(item.folder_name || '') === String(plan.folder_name); });
      const localPreview = createClientTransferMessage(plan, folderItems);
      const response = await fetch('/api/transfers/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: plan.recipient, contact: plan.contact, condition: plan.condition, scheduled_date: plan.scheduled_date || '', message: plan.message, folder_name: plan.folder_name, sender_id: sender.id, items: folderItems.map(function (item) { return { title: item.title, summary: item.ai_summary || item.description || '' }; }) })
      });
      let result = await response.json().catch(function () { return {}; });
      const preview = result.preview || localPreview;
      if (!response.ok && (result.preview || response.status === 401)) {
        await sendAiMessageWithGmail(plan, preview);
        result = { success: true, channel: 'gmail', message: preview };
      } else if (!response.ok) {
        throw new Error(result.error || 'AI 전달에 실패했습니다.');
      }
      plan.status = result.pending ? 'ready' : 'delivered';
      if (!result.pending) plan.delivered_at = new Date().toISOString();
      plan.delivery_channel = result.channel;
      plan.ai_message = result.message;
      writeJson(KEYS.transfers, plans);
      window.renderTransferView();
      alert('AI가 수신인 이메일로 전달했습니다.');
    } catch (error) {
      alert(error.message || 'AI 전달에 실패했습니다.');
      if (button) { button.disabled = false; button.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> AI로 전달'; }
    }
  };

  function encodeBase64Url(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(index, index + 0x8000));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async function sendAiMessageWithGmail(plan, message) {
    await loadGoogleIdentity();
    return new Promise(function (resolve, reject) {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_WEB_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/gmail.send',
        hint: getTransferSender(plan).email || undefined,
        callback: async function (tokenResponse) {
          if (tokenResponse.error) return reject(new Error('Gmail 발송 권한을 승인하지 못했습니다.'));
          const subject = 'MemoryLink 디지털 유산 전달 - ' + plan.folder_name;
          const mime = ['To: ' + plan.contact, 'Subject: =?UTF-8?B?' + btoa(unescape(encodeURIComponent(subject))) + '?=', 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', '', message].join('\r\n');
          const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenResponse.access_token }, body: JSON.stringify({ raw: encodeBase64Url(mime) }) });
          if (!response.ok) return reject(new Error('Gmail이 이메일을 발송하지 못했습니다. Gmail API 설정을 확인해 주세요.'));
          resolve();
        },
        error_callback: function () { reject(new Error('Google 계정 선택 창을 열지 못했습니다.')); }
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  window.shareTransferFolder = async function (id) {
    const plan = readJson(KEYS.transfers, []).find(function (item) { return String(item.id) === String(id); });
    if (!plan) return;
    if (!plan.folder_name) return alert('전달할 폴더가 선택된 계획을 새로 저장해 주세요.');
    const file = new File([JSON.stringify(transferPackage(plan), null, 2)], 'MemoryLink-' + (plan.folder_name || 'legacy') + '.json', { type: 'application/json' });
    if (!navigator.share) return window.downloadTransferPackage(id);
    try {
      const data = { title: 'MemoryLink 디지털 유산 전달', text: transferMessage(plan) };
      if (!navigator.canShare || navigator.canShare({ files: [file] })) data.files = [file];
      await navigator.share(data);
    } catch (error) {
      if (error && error.name !== 'AbortError') alert('휴대폰 공유를 열지 못했습니다. 폴더 패키지를 내려받아 직접 첨부해 주세요.');
    }
  };

  window.downloadTransferPackage = function (id) {
    const plans = readJson(KEYS.transfers, []);
    const plan = plans.find(function (item) { return String(item.id) === String(id); });
    if (!plan) return;
    const blob = new Blob([JSON.stringify(transferPackage(plan), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'MemoryLink-transfer-' + id + '.json';
    link.click();
    URL.revokeObjectURL(url);
    plan.status = 'ready';
    plan.prepared_at = new Date().toISOString();
    writeJson(KEYS.transfers, plans);
    window.renderTransferView();
  };

  window.markTransferDelivered = function (id) {
    const plans = readJson(KEYS.transfers, []);
    const plan = plans.find(function (item) { return String(item.id) === String(id); });
    if (!plan || !confirm('수신인에게 전달을 완료한 것으로 기록할까요?')) return;
    plan.status = 'delivered';
    plan.delivered_at = new Date().toISOString();
    writeJson(KEYS.transfers, plans);
    window.renderTransferView();
  };

  const originalRenderTransfer = window.renderTransferView;
  window.renderTransferView = function () {
    if (typeof originalRenderTransfer === 'function') originalRenderTransfer();
    const root = document.getElementById('legacy-transfer-content');
    if (!root) return;
    const plans = readJson(KEYS.transfers, []);
    const form = root.querySelector('.legacy-form');
    const summary = root.querySelector('.legacy-summary-card');
    if (summary) summary.remove();
    if (form && form.elements.contact) {
      const emailInput = form.elements.contact;
      emailInput.type = 'email';
      emailInput.placeholder = 'family@example.com';
      emailInput.autocomplete = 'email';
      const contactLabel = emailInput.closest('label');
      if (contactLabel && contactLabel.firstChild) contactLabel.firstChild.textContent = '수신인 이메일';
    }
    if (form && !form.elements.folder_name) {
      const messageLabel = form.querySelector('textarea[name="message"]');
      const label = document.createElement('label');
      label.innerHTML = '전달할 폴더<input type="hidden" name="folder_name" required><button id="transfer-folder-picker-button" class="feature-folder-picker" type="button" onclick="openTransferFolderPicker()"><i class="fas fa-folder-open"></i><span><strong>폴더 선택 창 열기</strong><small>전달할 폴더를 직접 선택하세요.</small></span><i class="fas fa-chevron-right"></i></button><small>선택한 폴더의 자료만 AI가 수신인에게 전달합니다.</small>';
      if (messageLabel && messageLabel.parentElement) form.insertBefore(label, messageLabel.parentElement);
    }
    const existing = root.querySelector('.legacy-plan-list');
    if (!existing || !plans.length) return;
    existing.innerHTML = plans.map(function (plan) {
      const status = plan.status === 'delivered' ? '전달 완료' : plan.status === 'ready' ? '전달 준비 완료' : '계획 저장';
      const folder = '<span class="feature-plan-folder"><i class="fas fa-folder"></i> ' + escapeHtml(transferFolderLabel(plan.folder_name)) + '</span>' + transferFolderContents(plan.folder_name, 5);
      const delivered = plan.status === 'delivered';
      const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(plan.contact || '').trim());
      const sender = getTransferSender(plan);
      const scheduled = plan.scheduled_date ? '<span class="feature-folder-chip"><i class="fas fa-calendar-day"></i> ' + escapeHtml(plan.scheduled_date) + '</span>' : '';
      const deliveryAction = delivered ? '<span class="feature-delivered"><i class="fas fa-circle-check"></i> AI 전달 완료</span>' : hasEmail ? '<button class="feature-send-now" onclick="aiDeliverTransfer(' + Number(plan.id) + ',this)"><i class="fas fa-wand-magic-sparkles"></i> AI로 전달</button>' : '<span class="feature-email-required"><i class="fas fa-envelope-circle-xmark"></i> 이메일 재등록 필요</span>';
      return '<div class="legacy-plan feature-plan"><div><strong>' + escapeHtml(plan.recipient) + '</strong><small>' + (hasEmail ? escapeHtml(plan.contact) : '기존 휴대폰 번호 계획 · 이메일로 다시 등록해 주세요.') + '<br>발신: ' + escapeHtml(sender.label) + '<br>' + escapeHtml(plan.condition) + ' · ' + status + '</small>' + folder + scheduled + '</div><div class="feature-plan-actions">' + deliveryAction + '<button class="danger" onclick="deleteTransferPlan(' + Number(plan.id) + ')"><i class="fas fa-trash"></i> 삭제</button></div></div>';
    }).join('');
  };

  function loadGoogleIdentity() {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = resolve;
      script.onerror = function () { reject(new Error('Google 인증 모듈을 불러오지 못했습니다.')); };
      document.head.appendChild(script);
    });
  }

  async function fetchDriveFiles(token) {
    const response = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=30&fields=files(id,name,mimeType,modifiedTime,size,webContentLink)&orderBy=modifiedTime desc', { headers: { Authorization: 'Bearer ' + token } });
    if (!response.ok) throw new Error('Google Drive 파일 목록을 가져오지 못했습니다.');
    return (await response.json()).files || [];
  }

  function showDriveFiles(files, token) {
    window.memoryLinkDriveToken = token;
    window.memoryLinkDriveFiles = files;
    const html = files.length ? files.map(function (file, index) {
      return '<div class="feature-drive-row"><i class="fab fa-google-drive"></i><div><strong>' + escapeHtml(file.name) + '</strong><small>' + escapeHtml(file.mimeType) + ' · ' + new Date(file.modifiedTime).toLocaleDateString('ko-KR') + '</small></div><button onclick="importDriveFile(' + index + ')">가져오기</button></div>';
    }).join('') : '<div class="feature-empty">가져올 수 있는 파일이 없습니다.</div>';
    showManager('Google Drive에서 가져오기', html);
  }

  function isGoogleWebOriginAllowed() {
    return location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  }

  function driveSetupHtml(message) {
    const originAllowed = isGoogleWebOriginAllowed();
    const originNotice = originAllowed
      ? '<div class="feature-drive-status ok"><strong>웹 인증 가능 주소</strong><small>' + escapeHtml(location.origin) + '</small></div>'
      : '<div class="feature-drive-status error"><strong>현재 주소에서는 Google 로그인이 차단됩니다.</strong><small>PC에서 http://127.0.0.1:4175/ 로 접속하거나 HTTPS 배포 주소를 사용하세요.</small></div>';
    return '<div class="feature-drive-setup">' +
      originNotice +
      (message ? '<div class="feature-drive-message">' + escapeHtml(message) + '</div>' : '') +
      '<div class="feature-drive-status ok"><strong>Google Drive 연결 준비 완료</strong><small>Google 계정을 선택하면 읽기 전용으로 연결됩니다. MemoryLink에는 Google 비밀번호가 저장되지 않습니다.</small></div>' +
      '<div class="feature-manager-actions">' +
      '<button class="legacy-primary" onclick="startGoogleDriveConnection()">Google 계정으로 연결</button>' +
      '</div></div>';
  }

  window.openGoogleDriveSettings = function (message) {
    showManager('Google Drive 웹 연결', driveSetupHtml(message || ''));
  };

  window.resetGoogleDriveSettings = function () {
    localStorage.removeItem(KEYS.googleClientId);
    window.memoryLinkDriveToken = null;
    window.openGoogleDriveSettings('저장된 Google 연결 설정을 초기화했습니다.');
  };

  window.saveGoogleDriveSettingsAndConnect = function () {
    const input = document.getElementById('google-drive-client-id');
    const clientId = String(input && input.value || '').trim();
    if (!/^[0-9]+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId)) {
      return window.openGoogleDriveSettings('올바른 웹 클라이언트 ID를 입력하세요.');
    }
    localStorage.setItem(KEYS.googleClientId, clientId);
    window.startGoogleDriveConnection();
  };

  window.startGoogleDriveConnection = async function () {
    const clientId = GOOGLE_WEB_CLIENT_ID;
    if (!isGoogleWebOriginAllowed()) return window.openGoogleDriveSettings('Google은 일반 HTTP IP 주소의 웹 로그인을 허용하지 않습니다.');
    try {
      await loadGoogleIdentity();
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: async function (response) {
          if (response.error) return window.openGoogleDriveSettings('Google 승인이 취소되었거나 실패했습니다: ' + response.error);
          try {
            const files = await fetchDriveFiles(response.access_token);
            showDriveFiles(files, response.access_token);
          } catch (error) {
            window.openGoogleDriveSettings(error.message || 'Google Drive 파일 목록을 가져오지 못했습니다.');
          }
        },
        error_callback: function (error) {
          const type = error && error.type ? error.type : 'popup_failed';
          window.openGoogleDriveSettings('Google 로그인 창을 열지 못했습니다: ' + type);
        }
      });
      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch (error) {
      window.openGoogleDriveSettings(error.message || 'Google Drive 연결에 실패했습니다.');
    }
  };

  window.connectDriveDemo = function () {
    if (!isGoogleWebOriginAllowed()) return window.openGoogleDriveSettings();
    window.startGoogleDriveConnection();
  };

  window.importDriveFile = async function (index) {
    const file = (window.memoryLinkDriveFiles || [])[index];
    const token = window.memoryLinkDriveToken;
    if (!file || !token) return;
    const category = classifyMemory({ title: file.name, file_type: file.mimeType });
    const item = {
      id: Date.now(),
      title: file.name.replace(/\.[^.]+$/, ''),
      description: 'Google Drive에서 가져온 자료',
      file_name: file.name,
      file_type: file.mimeType,
      file_url: 'https://drive.google.com/file/d/' + file.id + '/view',
      drive_file_id: file.id,
      category_id: category.id,
      folder_name: recommendedFolder({ title: file.name }, category),
      importance_score: 5,
      legacy_status: 'review',
      original_date: file.modifiedTime,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const next = memories();
    next.unshift(item);
    saveMemories(next);
    enrichAllMemories();
    window.closeFeatureManager();
    refreshViews();
    alert('Google Drive 자료를 MemoryLink에 가져왔습니다.');
  };

  function injectControls() {
    const folderHead = document.querySelector('.legacy-folder-panel .legacy-section-head');
    if (folderHead && !folderHead.querySelector('.feature-folder-manage')) {
      const actions = folderHead.querySelector('button') && folderHead.querySelector('button').parentElement === folderHead ? null : null;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'feature-folder-manage';
      button.innerHTML = '<i class="fas fa-folder-tree"></i> 폴더 관리';
      button.onclick = window.openFolderManager;
      folderHead.appendChild(button);
    }
    const taskPanel = document.getElementById('legacy-tasks');
    if (taskPanel) {
      const firstButton = taskPanel.querySelector('button');
      if (firstButton) firstButton.onclick = window.openDuplicateManager;
    }
  }

  function injectStyles() {
    if (document.getElementById('feature-complete-styles')) return;
    const style = document.createElement('style');
    style.id = 'feature-complete-styles';
    style.textContent = '.feature-modal{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:24px;background:rgba(12,22,45,.55);backdrop-filter:blur(8px)}.feature-modal.hidden{display:none}.feature-modal-card{width:min(880px,100%);max-height:88vh;overflow:auto;border-radius:20px;background:#fff;padding:24px;box-shadow:0 28px 80px rgba(13,31,70,.25)}.feature-modal-head{display:flex;align-items:center;justify-content:space-between;padding-bottom:16px;border-bottom:1px solid #e5eaf3}.feature-modal-head span{color:#315efb;font-size:10px;font-weight:850;letter-spacing:.16em}.feature-modal-head h3{margin-top:5px;color:#16213d;font-size:22px;font-weight:850}.feature-modal-head>button{width:38px;height:38px;border-radius:10px;background:#f2f5fa}.feature-manager-actions{display:flex;gap:8px;margin:18px 0}.feature-manager-actions button{min-height:40px;padding:0 14px;border:1px solid #dfe6f0;border-radius:10px;font-size:12px;font-weight:800}.feature-folder-row,.feature-drive-row,.feature-move-row{display:grid;grid-template-columns:38px minmax(0,1fr) auto auto;align-items:center;gap:10px;padding:12px 0;border-top:1px solid #edf1f6}.feature-folder-row>i,.feature-drive-row>i{width:38px;height:38px;display:grid;place-items:center;border-radius:10px;background:#edf2ff;color:#315efb}.feature-folder-row strong,.feature-folder-row small,.feature-drive-row strong,.feature-drive-row small,.feature-move-row strong,.feature-move-row small{display:block}.feature-folder-row small,.feature-drive-row small,.feature-move-row small{margin-top:3px;color:#768197;font-size:11px}.feature-folder-row button,.feature-drive-row button,.feature-move-row select{min-height:34px;padding:0 10px;border:1px solid #dfe6f0;border-radius:8px;background:#fff;font-size:11px;font-weight:750}.danger{color:#c34455!important}.feature-subtitle{margin-top:24px;padding-top:18px;border-top:1px solid #e5eaf3;color:#16213d;font-size:15px}.feature-move-row{grid-template-columns:minmax(0,1fr) minmax(170px,260px)}.feature-result-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.feature-result-grid>*{padding:18px;border:1px solid #e1e7f0;border-radius:14px;background:#f8faff;text-align:left}.feature-result-grid strong,.feature-result-grid span,.feature-result-grid small{display:block}.feature-result-grid strong{color:#315efb;font-size:26px}.feature-result-grid span{margin-top:5px;font-size:13px;font-weight:800}.feature-result-grid small{margin-top:4px;color:#768197;font-size:10px}.feature-cleanup-list{margin-top:16px}.feature-cleanup-list article{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:12px 0;border-top:1px solid #edf1f6}.feature-cleanup-list strong,.feature-cleanup-list small{display:block}.feature-cleanup-list small{margin-top:3px;color:#768197;font-size:11px}.feature-cleanup-list button,.feature-plan button{min-height:32px;padding:0 9px;border:1px solid #dfe6f0;border-radius:8px;background:#fff;font-size:10px;font-weight:750}.feature-ai-results{margin-bottom:16px}.feature-duplicate-group{margin-top:15px;padding:14px;border:1px solid #e1e7f0;border-radius:14px}.feature-duplicate-group h4{color:#315efb}.feature-duplicate-group>div{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #edf1f6}.feature-duplicate-group strong,.feature-duplicate-group small{display:block}.feature-duplicate-group small{color:#768197}.feature-duplicate-group em{color:#315efb;font-size:11px;font-style:normal;font-weight:800}.feature-empty{padding:32px;text-align:center;color:#768197}.feature-plan{display:flex!important;align-items:center;justify-content:space-between}.feature-plan>div:last-child{display:flex;gap:6px}@media(max-width:1150px) and (min-width:769px){#main-app>header #user-name{display:none!important}#main-app>header>div>div:last-child{flex:0 0 auto!important;min-width:44px!important}#main-app>header>div>div:last-child>button{width:44px!important;min-width:44px!important;padding:0!important;font-size:0!important}#main-app>header>div>div:last-child>button i{font-size:15px!important;margin:0!important}}@media(max-width:700px){.feature-result-grid{grid-template-columns:1fr}.feature-folder-row,.feature-drive-row{grid-template-columns:36px 1fr}.feature-folder-row button,.feature-drive-row button{grid-column:2}.feature-move-row{grid-template-columns:1fr}.feature-cleanup-list article{grid-template-columns:1fr 1fr}.feature-cleanup-list article>div{grid-column:1/-1}.feature-modal-card{padding:18px}.feature-plan{align-items:flex-start;flex-direction:column}}';
    style.textContent += '.feature-drive-setup{padding:18px 0}.feature-drive-setup label{display:block;margin:18px 0 7px;color:#16213d;font-size:12px;font-weight:850}.feature-drive-setup input{width:100%;min-height:48px;padding:0 14px;border:1px solid #d8e0ec;border-radius:11px;background:#fff;color:#16213d;font-size:13px}.feature-drive-setup p{margin-top:10px;color:#657087;font-size:11px;line-height:1.7}.feature-drive-status{padding:14px;border-radius:12px}.feature-drive-status strong,.feature-drive-status small{display:block}.feature-drive-status small{margin-top:4px}.feature-drive-status.ok{background:#eef8f3;color:#16734b}.feature-drive-status.error{background:#fff1f2;color:#b4233c}.feature-drive-message{margin-top:12px;padding:12px;border-radius:10px;background:#fff7e8;color:#8b5a00;font-size:12px}.feature-drive-setup .feature-manager-actions{align-items:center;flex-wrap:wrap}.feature-drive-setup .feature-manager-actions a{padding:11px 14px;border-radius:10px;color:#315efb;font-size:12px;font-weight:800;text-decoration:none}';
    style.textContent += '.legacy-form label>small{color:#8791a5;font-size:10px;font-weight:600}.feature-plan-folder{display:inline-flex;margin-top:8px;padding:5px 8px;border-radius:7px;background:#edf2ff;color:#315efb;font-size:10px;font-weight:800}.feature-plan-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px}.feature-plan-actions button{white-space:nowrap}.feature-plan-actions button i{margin-right:4px}.feature-plan-actions .feature-send-now{border-color:#315efb;background:#315efb;color:#fff}.feature-delivered,.feature-email-required{display:inline-flex;align-items:center;gap:5px;padding:8px 10px;border-radius:8px;font-size:10px;font-weight:850}.feature-delivered{background:#eaf8f1;color:#16734b}.feature-email-required{background:#fff3e8;color:#a64b19}@media(max-width:700px){.feature-plan-actions{width:100%;justify-content:flex-start}.feature-plan-actions button{flex:1 1 calc(50% - 6px)}.feature-plan-actions .feature-send-now{flex-basis:100%}}';
    style.textContent += '.feature-folder-picker{width:100%;display:grid;grid-template-columns:38px minmax(0,1fr) 20px;align-items:center;gap:10px;padding:12px!important;border:1px solid #d8e0ec!important;border-radius:10px!important;background:#fff!important;text-align:left}.feature-folder-picker>i:first-child{width:38px;height:38px;display:grid;place-items:center;border-radius:9px;background:#edf2ff;color:#315efb}.feature-folder-picker span,.feature-folder-picker strong,.feature-folder-picker small{display:block}.feature-folder-picker strong{color:#16213d;font-size:12px}.feature-folder-picker small{margin-top:3px;color:#7a8599;font-size:10px}.feature-folder-picker>i:last-child{color:#9aa4b6}.feature-folder-picker.selected{border-color:#315efb!important;background:#f8faff!important}.feature-transfer-folder-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding-top:18px}.feature-transfer-folder-grid button{display:grid;grid-template-columns:42px 1fr;gap:3px 10px;align-items:center;padding:16px;border:1px solid #dfe6f0;border-radius:14px;background:#fff;text-align:left}.feature-transfer-folder-grid button:hover{border-color:#315efb;background:#f6f8ff}.feature-transfer-folder-grid i{grid-row:1/3;width:42px;height:42px;display:grid;place-items:center;border-radius:10px;background:#edf2ff;color:#315efb}.feature-transfer-folder-grid strong{font-size:13px}.feature-transfer-folder-grid small{color:#7a8599;font-size:10px}.feature-date-picker{display:grid;gap:18px;padding-top:12px}.feature-date-picker p{margin:0;color:#4b5567}.feature-date-picker label{display:grid;gap:8px;font-size:12px;font-weight:700}.feature-date-picker input{width:100%;padding:14px;border:1px solid #d8e0ec;border-radius:10px;font:inherit}.feature-date-picker .legacy-primary{min-height:46px}@media(max-width:700px){.feature-transfer-folder-grid{grid-template-columns:1fr}}';
    style.textContent += '.feature-transfer-folder-grid button{display:block;min-width:0}.feature-folder-title{display:grid;grid-template-columns:42px 1fr;gap:3px 10px;align-items:center}.feature-folder-title>i{grid-row:1/3!important;width:42px!important;height:42px!important;display:grid!important;place-items:center!important;border-radius:10px!important;background:#edf2ff!important;color:#315efb!important}.feature-folder-title>strong,.feature-folder-title>small{grid-column:2}.feature-folder-contents{display:grid;gap:6px;margin-top:13px;padding-top:11px;border-top:1px solid #edf1f6}.feature-folder-contents span{display:flex;align-items:center;gap:7px;min-width:0;color:#4f5b70;font-size:10px}.feature-folder-contents span i{width:22px!important;height:22px!important;display:grid!important;place-items:center!important;flex:0 0 22px;border-radius:6px!important;background:#f3f5f9!important;color:#6b7890!important}.feature-folder-contents span b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700}.feature-folder-contents em,.feature-folder-empty{color:#8a94a7;font-size:10px;font-style:normal}.feature-plan .feature-folder-contents{max-width:420px;margin-top:7px}.feature-plan .feature-folder-contents span{font-size:9px}@media(max-width:700px){.feature-plan .feature-folder-contents{max-width:100%}}';
    document.head.appendChild(style);
  }

  const originalSaveLocal = window.saveLocalMemory;
  if (typeof originalSaveLocal === 'function') {
    window.saveLocalMemory = function (data, id) {
      const category = classifyMemory(data);
      const enhanced = Object.assign({}, data, {
        category_id: data.category_id || category.id,
        folder_name: data.folder_name || recommendedFolder(data, category),
        importance_score: Number(data.importance_score) === 5 ? calculateImportance(data) : data.importance_score,
        file_hash: window.memoryLinkPendingHash || data.file_hash || null
      });
      window.memoryLinkPendingHash = null;
      const result = originalSaveLocal(enhanced, id);
      setTimeout(function () { enrichAllMemories(); injectControls(); }, 0);
      return result;
    };
  }

  document.addEventListener('change', async function (event) {
    if (!event.target || event.target.id !== 'file-input' || !event.target.files || !event.target.files[0]) return;
    try {
      const buffer = await event.target.files[0].arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      window.memoryLinkPendingHash = Array.from(new Uint8Array(digest)).map(function (byte) { return byte.toString(16).padStart(2, '0'); }).join('');
    } catch {
      window.memoryLinkPendingHash = null;
    }
  }, true);

  const originalWorkspace = window.renderLegacyWorkspace;
  if (typeof originalWorkspace === 'function') {
    window.renderLegacyWorkspace = function () {
      originalWorkspace();
      injectControls();
    };
  }

  injectStyles();
  ensureModal();
  injectControls();
})();
