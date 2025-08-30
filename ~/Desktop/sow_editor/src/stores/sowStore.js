import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';

export const useSOWStore = create(
    subscribeWithSelector(
        immer((set, get) => ({
            // Document state
            sections: [],
            currentSection: null,
            documentTitle: 'Untitled SOW',

            // Session state
            currentSession: null,
            sessionHistory: [],
            changeLog: [],

            // Template state
            currentTemplate: null,
            availableTemplates: [],

            // Chat state
            chatMessages: [],
            isClaudeTyping: false,
            pendingClarifications: [],

            // UI state
            selectedText: null,
            inlineControls: {
                visible: false,
                position: { x: 0, y: 0 },
                suggestions: []
            },

            // Pending suggestions (Cursor-style)
            pendingSuggestion: null,
            suggestionHistory: [],

            // Export state
            exportInProgress: false,

            // Actions
            addSection: (section) => set((state) => {
                state.sections.push({
                    id: Date.now().toString(),
                    ...section,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                state.changeLog.push({
                    type: 'ADD_SECTION',
                    sectionId: section.id,
                    timestamp: new Date().toISOString(),
                    data: section
                });
            }),

            updateSection: (sectionId, updates) => set((state) => {
                const sectionIndex = state.sections.findIndex(s => s.id === sectionId);
                if (sectionIndex !== -1) {
                    const oldSection = { ...state.sections[sectionIndex] };
                    state.sections[sectionIndex] = {
                        ...state.sections[sectionIndex],
                        ...updates,
                        updatedAt: new Date().toISOString()
                    };
                    state.changeLog.push({
                        type: 'UPDATE_SECTION',
                        sectionId,
                        timestamp: new Date().toISOString(),
                        oldData: oldSection,
                        newData: state.sections[sectionIndex]
                    });
                }
            }),

            deleteSection: (sectionId) => set((state) => {
                const sectionIndex = state.sections.findIndex(s => s.id === sectionId);
                if (sectionIndex !== -1) {
                    const deletedSection = state.sections[sectionIndex];
                    state.sections.splice(sectionIndex, 1);
                    state.changeLog.push({
                        type: 'DELETE_SECTION',
                        sectionId,
                        timestamp: new Date().toISOString(),
                        data: deletedSection
                    });
                }
            }),

            setCurrentSection: (sectionId) => set((state) => {
                state.currentSection = sectionId;
            }),

            addChatMessage: (message) => set((state) => {
                state.chatMessages.push({
                    id: Date.now().toString(),
                    ...message,
                    timestamp: new Date().toISOString()
                });
            }),

            setClaudeTyping: (isTyping) => set((state) => {
                state.isClaudeTyping = isTyping;
            }),

            showInlineControls: (position, suggestions) => set((state) => {
                state.inlineControls = {
                    visible: true,
                    position,
                    suggestions
                };
            }),

            hideInlineControls: () => set((state) => {
                state.inlineControls.visible = false;
            }),

            acceptSuggestion: (suggestionId) => set((state) => {
                const suggestion = state.inlineControls.suggestions.find(s => s.id === suggestionId);
                if (suggestion && state.currentSection) {
                    const sectionIndex = state.sections.findIndex(s => s.id === state.currentSection);
                    if (sectionIndex !== -1) {
                        state.sections[sectionIndex].content = suggestion.content;
                        state.sections[sectionIndex].updatedAt = new Date().toISOString();
                        state.changeLog.push({
                            type: 'ACCEPT_SUGGESTION',
                            sectionId: state.currentSection,
                            suggestionId,
                            timestamp: new Date().toISOString(),
                            data: suggestion
                        });
                    }
                }
                state.inlineControls.visible = false;
            }),

            rejectSuggestion: (suggestionId) => set((state) => {
                state.changeLog.push({
                    type: 'REJECT_SUGGESTION',
                    suggestionId,
                    timestamp: new Date().toISOString()
                });
                state.inlineControls.visible = false;
            }),

            loadTemplate: (template) => set((state) => {
                state.currentTemplate = template;
                state.sections = template.sections || [];
                state.documentTitle = template.title || 'Untitled SOW';
            }),

            undo: () => set((state) => {
                // Implement undo logic based on changeLog
                const lastChange = state.changeLog[state.changeLog.length - 1];
                if (lastChange) {
                    // Reverse the last change
                    switch (lastChange.type) {
                        case 'ADD_SECTION':
                            state.sections = state.sections.filter(s => s.id !== lastChange.sectionId);
                            break;
                        case 'UPDATE_SECTION':
                            const sectionIndex = state.sections.findIndex(s => s.id === lastChange.sectionId);
                            if (sectionIndex !== -1) {
                                state.sections[sectionIndex] = lastChange.oldData;
                            }
                            break;
                        case 'DELETE_SECTION':
                            state.sections.push(lastChange.data);
                            break;
                    }
                    state.changeLog.pop();
                }
            }),

            exportDocument: async (format) => {
                set((state) => {
                    state.exportInProgress = true;
                });

                try {
                    // Export logic will be implemented in services
                    const { exportService } = await import('../services/exportService');
                    const result = await exportService.export(get().sections, format);
                    return result;
                } finally {
                    set((state) => {
                        state.exportInProgress = false;
                    });
                }
            },

            // Pending suggestion actions
            setPendingSuggestion: (suggestion) => set((state) => {
                state.pendingSuggestion = suggestion;
            }),

            acceptSuggestion: () => set((state) => {
                if (state.pendingSuggestion) {
                    // Add to history
                    state.suggestionHistory.push({
                        ...state.pendingSuggestion,
                        status: 'accepted',
                        acceptedAt: new Date().toISOString()
                    });
                    
                    // Clear pending
                    state.pendingSuggestion = null;
                }
            }),

            rejectSuggestion: () => set((state) => {
                if (state.pendingSuggestion) {
                    // Add to history
                    state.suggestionHistory.push({
                        ...state.pendingSuggestion,
                        status: 'rejected',
                        rejectedAt: new Date().toISOString()
                    });
                    
                    // Clear pending
                    state.pendingSuggestion = null;
                }
            }),

            clearPendingSuggestion: () => set((state) => {
                state.pendingSuggestion = null;
            })
        }))
    )
);