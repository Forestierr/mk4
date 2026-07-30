import { describe, it, expect } from 'vitest';
import { getSvgHtml } from '../webviews/preview-html';
import { getMarkdownHtml } from '../webviews/markdown-html';
import { getErrorHtml } from '../webviews/error-html';
import { escapeHtml } from '../webviews/escape-html';

// ──────────────────────────────────────────────────────────────
// getSvgHtml — structure de la webview Typst (chargée une fois)
// ──────────────────────────────────────────────────────────────
describe('getSvgHtml — structure initiale', () => {
    it('ne prend aucun argument et retourne du HTML valide', () => {
        const html = getSvgHtml();
        expect(html).toContain('<!DOCTYPE html>');
    });

    it('contient le conteneur de pages #pages-container', () => {
        expect(getSvgHtml()).toContain('id="pages-container"');
    });

    it('contient le message de chargement initial #loading', () => {
        expect(getSvgHtml()).toContain('id="loading"');
        expect(getSvgHtml()).toContain('Compilation en cours');
    });

    it('contient le bandeau d\'erreur #error-banner (caché par défaut)', () => {
        const html = getSvgHtml();
        expect(html).toContain('id="error-banner"');
        expect(html).toContain('display: none');
        expect(html).toContain('id="error-text"');
    });

    it('contient le handler de mise à jour incrémentale (type: update)', () => {
        // Le JS de la webview doit gérer les messages de type 'update'
        expect(getSvgHtml()).toContain("message.type === 'update'");
        expect(getSvgHtml()).toContain('applyUpdate');
    });

    it('contient la logique de mise à jour des pages (applyUpdate)', () => {
        const html = getSvgHtml();
        // Gestion des nouvelles pages
        expect(html).toContain("createElement('div')");
        // Gestion de la suppression des pages en trop
        expect(html).toContain('.remove()');
        // Suppression du loader
        expect(html).toContain("getElementById('loading')");
    });

    it('contient le handler d\'erreur Typst (showError / clearError)', () => {
        const html = getSvgHtml();
        expect(html).toContain("message.type === 'showError'");
        expect(html).toContain("message.type === 'clearError'");
        expect(html).toContain('errorBanner.style.display');
    });

    it('contient le scroll sync éditeur → preview (syncScroll)', () => {
        expect(getSvgHtml()).toContain("message.command === 'syncScroll'");
        expect(getSvgHtml()).toContain('handleEditorScroll');
    });

    it('contient le scroll sync preview → éditeur (revealLine)', () => {
        expect(getSvgHtml()).toContain("command: 'revealLine'");
        expect(getSvgHtml()).toContain('acquireVsCodeApi');
    });

    it('reconstruit le cache de positions après une mise à jour (rebuildAbsYCache)', () => {
        expect(getSvgHtml()).toContain('rebuildAbsYCache');
        expect(getSvgHtml()).toContain('requestAnimationFrame');
    });
});

// ──────────────────────────────────────────────────────────────
// Format du message postMessage { type: 'update' }
// ──────────────────────────────────────────────────────────────
describe('Format du message postMessage update', () => {
    it('le message update contient les clés pages et map', () => {
        // Simulation du payload envoyé par preview.ts → webview
        const message = {
            type: 'update',
            pages: ['<svg>page1</svg>', '<svg>page2</svg>'],
            map: [
                { value: '1', pos: { page: 1, y: '42pt' } },
                { value: '10', pos: { page: 2, y: '100pt' } },
            ],
        };

        expect(message.type).toBe('update');
        expect(message.pages).toHaveLength(2);
        expect(message.map).toHaveLength(2);
        expect(message.map[0]).toHaveProperty('value');
        expect(message.map[0]).toHaveProperty('pos.page');
        expect(message.map[0]).toHaveProperty('pos.y');
    });

    it('un message update avec 0 page est valide (document vide)', () => {
        const message = { type: 'update', pages: [], map: [] };
        expect(message.pages).toHaveLength(0);
        expect(message.map).toHaveLength(0);
    });
});

// ──────────────────────────────────────────────────────────────
// getMarkdownHtml
// ──────────────────────────────────────────────────────────────
describe('getMarkdownHtml', () => {
    it('injecte le contenu HTML dans le body', () => {
        const html = getMarkdownHtml('<p>Hello</p>');
        expect(html).toContain('<p>Hello</p>');
    });

    it('contient les styles de badges mk4', () => {
        const html = getMarkdownHtml('');
        expect(html).toContain('.mk4-badge');
        expect(html).toContain('.mk4-badges-container');
    });
});

// ──────────────────────────────────────────────────────────────
// getErrorHtml
// ──────────────────────────────────────────────────────────────
describe('getErrorHtml', () => {
    it('affiche le titre et le message', () => {
        const html = getErrorHtml('Mon Titre', 'Un message d\'erreur');
        expect(html).toContain('Mon Titre');
        expect(html).toContain('Un message d\'erreur');
    });

    it('échappe les caractères HTML dangereux dans le message', () => {
        const html = getErrorHtml('Erreur', '<script>alert(1)</script>');
        expect(html).not.toContain('<script>');
        expect(html).toContain('&lt;script&gt;');
    });
});

// ──────────────────────────────────────────────────────────────
// escapeHtml
// ──────────────────────────────────────────────────────────────
describe('escapeHtml', () => {
    it('échappe &', () => expect(escapeHtml('a & b')).toBe('a &amp; b'));
    it('échappe <', () => expect(escapeHtml('<div>')).toBe('&lt;div&gt;'));
    it('échappe >', () => expect(escapeHtml('1 > 0')).toBe('1 &gt; 0'));
    it('ne modifie pas un texte sans caractères spéciaux', () => {
        expect(escapeHtml('hello world')).toBe('hello world');
    });
});
