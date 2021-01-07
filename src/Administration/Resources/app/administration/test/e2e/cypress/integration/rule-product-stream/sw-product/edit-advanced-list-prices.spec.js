// / <reference types="Cypress" />

import ProductPageObject from '../../../support/pages/module/sw-product.page-object';

describe('Product: Edit list prices of context prices', () => {
    beforeEach(() => {
        cy.setToInitialState()
            .then(() => {
                cy.loginViaApi();
            })
            .then(() => {
                return cy.createProductFixture();
            })
            .then(() => {
                cy.openInitialPage(`${Cypress.env('admin')}#/sw/product/index`);
            });
    });

    it('@base @rule @product: creates context price rules', () => {
        cy.window().then((win) => {
            if (!win.Shopware.Feature.isActive('FEATURE_NEXT_10541')) {
                cy.log('Skipped test beause of missing feature flag: FEATURE_NEXT_10541');
                return;
            }

            const page = new ProductPageObject();
            const emptySelectRule = '.sw-product-detail-context-prices__empty-state-select-rule';

            // Request we want to wait for later
            cy.server();
            cy.route({
                url: `${Cypress.env('apiPath')}/product/*`,
                method: 'patch'
            }).as('saveData');

            // Edit base data of product
            cy.clickContextMenuItem(
                '.sw-entity-listing__context-menu-edit-action',
                page.elements.contextMenuButton,
                `${page.elements.dataGridRow}--0`
            );
            cy.get('.sw-product-detail__tab-advanced-prices').click();

            // Select price rule group
            cy.get(`${emptySelectRule}`)
                .typeSingleSelect('All customers', `${emptySelectRule}`);

            cy.get('.sw-product-detail-context-prices__toolbar').should('be.visible');
            cy.get('#sw-field--item-quantityEnd').should('be.visible');
            cy.get('#sw-field--item-quantityEnd').type('3');
            cy.get('#sw-field--item-quantityEnd').type('{enter}');

            cy.get('.sw-data-grid__row--1').should('be.visible');
            cy.get('.sw-data-grid__row--0 .sw-data-grid__cell--price-EUR .sw-list-price-field__list-price #sw-price-field-gross')
                .type('100');
            cy.get('.sw-data-grid__row--0 .sw-data-grid__cell--price-EUR .sw-list-price-field__list-price #sw-price-field-net')
                .should('have.value', '84.03');
            cy.get('.sw-data-grid__row--1 .sw-data-grid__cell--price-EUR .sw-list-price-field__list-price #sw-price-field-gross')
                .type('100');
            cy.get('.sw-data-grid__row--1 .sw-data-grid__cell--price-EUR .sw-list-price-field__list-price #sw-price-field-net')
                .should('have.value', '84.03');

            cy.get(page.elements.productSaveAction).click();

            // Verify updated product
            cy.wait('@saveData').then((xhr) => {
                expect(xhr).to.have.property('status', 204);
            });
            cy.get(page.elements.smartBarBack).click();
            cy.get(`${page.elements.dataGridRow}--0 .sw-data-grid__cell--name`)
                .contains('Product name');

            // Verify in storefront
            cy.visit('/');
            cy.get('.product-box').contains('from €64.00*');
            cy.get('input[name=search]').type('Product name');
            cy.get('.search-suggest-container').should('be.visible');
            cy.get('.search-suggest-product-name')
                .contains('Product name')
                .click();

            cy.get('.product-detail-name').contains('Product name');
            cy.get('.product-detail-advanced-list-price-wrapper').contains('100.00');
            cy.get('.product-detail-price').contains('64.00');
        });
    });
});
