/// <reference types="Cypress" />
import ProductPageObject from '../../support/pages/module/sw-product.page-object';

describe('Test visibility of reviews', () => {
    before(() => {
        cy.setToInitialState().then(() => {
            cy.loginViaApi();
        }).then(() => {
            cy.createProductFixture();
        }).then(() => {
            cy.openInitialPage(`${Cypress.env('admin')}#/sw/product/index`);
        });
    });

    it('@package: should display and then hide the review', () => {
        cy.intercept({
            url: `**/${Cypress.env('apiPath')}/_action/sync`,
            method: 'POST'
        }).as('saveProduct');
        cy.intercept({
            url: `/account/register`,
            method: 'POST'
        }).as('registerCustomer');
        cy.intercept({
            url: `**/${Cypress.env('apiPath')}/search/product-review`,
            method: 'POST'
        }).as('saveReview');

        const page = new ProductPageObject();

        // Add product to sales channel
        cy.clickContextMenuItem(
            '.sw-entity-listing__context-menu-edit-action',
            page.elements.contextMenuButton,
            `${page.elements.dataGridRow}--0`
        );
        cy.contains('h2','Product name').should('be.visible');
        cy.get('.sw-product-detail__select-visibility').scrollIntoView()
            .typeMultiSelectAndCheck('E2E install test');
        cy.get('.advanced-visibility').click();
        cy.get('.sw-modal__body').should('be.visible');
        cy.get('.sw-field__radio-option-checked [type]').check();
        cy.get('.sw-modal__footer .sw-button__content').click();
        cy.get('.sw-modal__body').should('not.be.visible');
        cy.get('.sw-button-process__content').click();
        cy.wait('@saveProduct').its('response.statusCode').should('equal', 200);
        cy.get('.sw-loader').should('not.exist');
        cy.get('.sw-button-process__content').contains('Opslaan').should('be.visible');

        // Login from reviews
        cy.visit('/account/login');
        cy.url().should('include', '/account/login');
        cy.get('#personalSalutation').select('Mr.');
        cy.get('#personalFirstName').typeAndCheckStorefront('Test');
        cy.get('#personalLastName').typeAndCheckStorefront('Tester');
        cy.get('#personalMail').typeAndCheckStorefront('test@tester.com');
        cy.get('#personalPassword').typeAndCheckStorefront('shopware');
        cy.get('#billingAddressAddressStreet').typeAndCheckStorefront('Test street');
        cy.get('#billingAddressAddressZipcode').typeAndCheckStorefront('12345');
        cy.get('#billingAddressAddressCity').typeAndCheckStorefront('Test city');
        cy.get('#billingAddressAddressCountry').select('Netherlands');
        cy.get('.btn.btn-lg.btn-primary').click();
        cy.wait('@registerCustomer').its('response.statusCode').should('equal', 302);

        // Write review
        cy.get('.header-search-input').should('be.visible').type('Product name');
        cy.contains('.search-suggest-product-name', 'Product name').click();
        cy.get('.product-detail-tabs #review-tab').click();
        cy.get('.alert-content').contains('No reviews found').should('be.visible');
        cy.get('button.product-detail-review-teaser-btn').contains('Write a review!').click();
        cy.get('.review-form').should('be.visible');
        cy.get('#reviewTitle').typeAndCheckStorefront('Lorem ipsum');
        cy.get('#reviewContent').typeAndCheckStorefront('Lorem ipsum dolor sit amet, consetetur sadipscing elitr');
        cy.get('.btn-review-submit').click();
        cy.get('.alert-success .alert-content').contains('Thank you for submitting your review.').should('be.visible');

        // Activate review in admin
        cy.visit(`${Cypress.env('admin')}#/sw/review/index`);
        cy.clickContextMenuItem(
            '.sw-entity-listing__context-menu-edit-action',
            '.sw-context-button__button',
            `.sw-data-grid__row--0`
        );
        cy.get('h2').contains('Lorem ipsum').should('be.visible');
        cy.get('input[name="sw-field--review-status"]').check();
        cy.get('.sw-button-process__content').click();
        cy.wait('@saveReview').its('response.statusCode').should('equal', 200);
        cy.get('.sw-button-process__content').contains('Opslaan').should('be.visible');

        // Verify review in the storefront
        cy.visit('/');
        cy.get('button#accountWidget').click();
        cy.get('.header-account-menu .account-aside-footer').contains('Logout').click();
        cy.get('.header-search-input').should('be.visible').type('Product name');
        cy.contains('.search-suggest-product-name', 'Product name').click();
        cy.get('.product-detail-tabs #review-tab').click();
        cy.get('.h5').contains('Lorem ipsum').should('be.visible');

        // Deactivate visibility of reviews and verify in the storefront
        cy.authenticate().then((result) => {
            const requestConfig = {
                headers: {
                    Authorization: `Bearer ${result.access}`
                },
                method: 'post',
                url: `api/_action/system-config/batch`,
                body: {
                    null: {
                        'core.listing.showReview': false
                    }
                }
            };
            return cy.request(requestConfig);
        });
        cy.reload();
        cy.get('.product-detail-tabs #review-tab').should('not.exist');
    });
});
