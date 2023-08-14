import { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
import compareProducts from './global/compare-products';
import FacetedSearch from './common/faceted-search';
import { createTranslationDictionary } from '../theme/common/utils/translations-utils';

const CART_API_URL = '/api/storefront/carts';

export default class Category extends CatalogPage {
    constructor(context) {
        super(context);
        this.validationDictionary = createTranslationDictionary(context);
    }

    setLiveRegionAttributes($element, roleType, ariaLiveStatus) {
        $element.attr({
            role: roleType,
            'aria-live': ariaLiveStatus,
        });
    }

    makeShopByPriceFilterAccessible() {
        if (!$('[data-shop-by-price]').length) return;

        if ($('.navList-action').hasClass('is-active')) {
            $('a.navList-action.is-active').focus();
        }

        $('a.navList-action').on('click', () => this.setLiveRegionAttributes($('span.price-filter-message'), 'status', 'assertive'));
    }

    createCart(route, cartItems) {
        return fetch(route, {
            method: "POST",
            credentials: "same-origin",
            headers: {
            "Content-Type": "application/json"
            },
            body: JSON.stringify(cartItems),
        })
        .then(response => response.json())
        .then(() => {
            $('.add-alert').css('display', 'block');
            $('.empty-button').css('display', 'inline');
        })
        .catch(error => console.error(error));
    }

    getCart(route) {
        return fetch(route, {
            method: "GET",
            credentials: "same-origin"
        })
        .then(response => response.json())
        .then(result => result)
        .catch(error => console.error(error));
    }

    addCartItem(routeStart, cartId, cartItems) {
        const route = routeStart + cartId + '/items';
        return fetch(route, {
            method: "POST",
            credentials: "same-origin",
            headers: {
            "Content-Type": "application/json"
            },
            body: JSON.stringify(cartItems),
        })
        .then(response => response.json())
        .then(() => {
            $('.add-alert').css('display', 'block');
            $('.empty-button').css('display', 'inline');
        })
        .catch(error => console.error(error));
    }

    deleteCart(routeStart, cartId) {
        const route = routeStart + cartId;
        return fetch(route, {
            method: "DELETE",
            credentials: "same-origin",
            headers: {
            "Content-Type": "application/json",
        }
        })
        .then(() => {
            $('.delete-alert').css('display', 'block');
            $('.empty-button').css('display', 'none');
        })
        .catch(error => console.error(error));
    }

    onReady() {
        this.arrangeFocusOnSortBy();

        $('[data-button-type="add-cart"]').on('click', (e) => this.setLiveRegionAttributes($(e.currentTarget).next(), 'status', 'polite'));

        this.makeShopByPriceFilterAccessible();

        compareProducts(this.context);

        if ($('#facetedSearch').length > 0) {
            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);
        }

        $('a.reset-btn').on('click', () => this.setLiveRegionsAttributes($('span.reset-message'), 'status', 'polite'));

        this.ariaNotifyNoProducts();

        $('#addAllToCart').on('click', async () => {
            const cart = await this.getCart(CART_API_URL);
            const cartItems = {"lineItems": []};

            for (let product of this.context.category.products) {
                cartItems.lineItems.push({
                    "quantity": 1,
                    "productId" : product.id
                });
            }
            cart.length ?  this.addCartItem(`${CART_API_URL}/`, cart[0].id, cartItems) : this.createCart(CART_API_URL, cartItems);
        });

        $('#emptyCart').on('click', async () => {
            const cart = await this.getCart(CART_API_URL);
            if (cart.length) {
                this.deleteCart(`${CART_API_URL}/`, cart[0].id);
            }
        });

        $('.add-alert .closebtn').on('click', () => $('.add-alert').css('display', 'none'));
        $('.delete-alert .closebtn').on('click', () => $('.delete-alert').css('display', 'none'));
    }

    ariaNotifyNoProducts() {
        const $noProductsMessage = $('[data-no-products-notification]');
        if ($noProductsMessage.length) {
            $noProductsMessage.focus();
        }
    }

    initFacetedSearch() {
        const {
            price_min_evaluation: onMinPriceError,
            price_max_evaluation: onMaxPriceError,
            price_min_not_entered: minPriceNotEntered,
            price_max_not_entered: maxPriceNotEntered,
            price_invalid_value: onInvalidPrice,
        } = this.validationDictionary;
        const $productListingContainer = $('#product-listing-container');
        const $facetedSearchContainer = $('#faceted-search-container');
        const productsPerPage = this.context.categoryProductsPerPage;
        const requestOptions = {
            config: {
                category: {
                    shop_by_price: true,
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
            showMore: 'category/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content) => {
            $productListingContainer.html(content.productListing);
            $facetedSearchContainer.html(content.sidebar);

            $('body').triggerHandler('compareReset');

            $('html, body').animate({
                scrollTop: 0,
            }, 100);
        }, {
            validationErrorMessages: {
                onMinPriceError,
                onMaxPriceError,
                minPriceNotEntered,
                maxPriceNotEntered,
                onInvalidPrice,
            },
        });
    }
}
