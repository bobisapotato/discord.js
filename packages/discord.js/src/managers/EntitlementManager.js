'use strict';

const { Collection } = require('@discordjs/collection');
const { makeURLSearchParams } = require('@discordjs/rest');
const { Routes, EntitlementOwnerType } = require('discord-api-types/v10');
const CachedManager = require('./CachedManager');
const { ErrorCodes, DiscordjsTypeError } = require('../errors/index');
const { Entitlement } = require('../structures/Entitlement');
const { resolveSKUId } = require('../util/Util');

/**
 * Manages API methods for entitlements and stores their cache.
 * @extends {CachedManager}
 */
class EntitlementManager extends CachedManager {
  constructor(client, iterable) {
    super(client, Entitlement, iterable);
  }

  /**
   * The cache of this manager
   * @type {Collection<Snowflake, Entitlement>}
   * @name EntitlementManager#cache
   */

  /**
   * Data that resolves to give an Entitlement object. This can be:
   * * An Entitlement object
   * * A Snowflake
   * @typedef {Entitlement|Snowflake} EntitlementResolvable
   */

  /**
   * Data that resolves to give a SKU object. This can be:
   * * A SKU object
   * * A Snowflake
   * @typedef {SKU|Snowflake} SKUResolvable
   */

  /**
   * Options used to fetch entitlements
   * @typedef {Object} FetchEntitlementsOptions
   * @property {number} [limit] The maximum number of entitlements to fetch
   * @property {GuildResolvable} [guild] The guild to fetch entitlements for
   * @property {UserResolvable} [user] The user to fetch entitlements for
   * @property {SKUResolvable[]} [skus] The SKUs to fetch entitlements for
   * @property {boolean} [excludeEnded] Whether to exclude ended entitlements
   * @property {boolean} [cache=true] Whether to cache the fetched entitlements
   * @property {Snowflake} [before] Consider only entitlements before this entitlement id
   * @property {Snowflake} [after] Consider only entitlements after this entitlement id
   * <warn>If both `before` and `after` are provided, only `before` is respected</warn>
   */

  /**
   * Fetches entitlements for this application
   * @param {FetchEntitlementsOptions} [options={}] Options for fetching the entitlements
   * @returns {Promise<Collection<Snowflake, Entitlement>>}
   */
  async fetch({ limit, guild, user, skus, excludeEnded, cache = true, before, after } = {}) {
    const query = makeURLSearchParams({
      limit,
      guild_id: guild && this.client.guilds.resolveId(guild),
      user_id: user && this.client.users.resolveId(user),
      sku_ids: skus?.map(sku => resolveSKUId(sku)).join(','),
      exclude_ended: excludeEnded,
      before,
      after,
    });

    const entitlements = await this.client.rest.get(Routes.entitlements(this.client.application.id), { query });
    return entitlements.reduce(
      (coll, entitlement) => coll.set(entitlement.id, this._add(entitlement, cache)),
      new Collection(),
    );
  }

  /**
   * Options used to create a test entitlement
   * <info>Either `guild` or `user` must be provided, but not both</info>
   * @typedef {Object} EntitlementCreateOptions
   * @property {SKUResolvable} sku The id of the SKU to create the entitlement for
   * @property {GuildResolvable} [guild] The guild to create the entitlement for
   * @property {UserResolvable} [user] The user to create the entitlement for
   */

  /**
   * Creates a test entitlement
   * @param {EntitlementCreateOptions} options Options for creating the test entitlement
   * @returns {Promise<Entitlement>}
   */
  async createTest({ sku, guild, user }) {
    const skuId = resolveSKUId(sku);
    if (!skuId) throw new DiscordjsTypeError(ErrorCodes.InvalidType, 'sku', 'SKUResolvable');

    if ((guild && user) || (!guild && !user)) {
      throw new DiscordjsTypeError(ErrorCodes.EntitlementCreateInvalidOwner);
    }

    const resolved = guild ? this.client.guilds.resolveId(guild) : this.client.users.resolveId(user);
    if (!resolved) {
      const name = guild ? 'guild' : 'user';
      const type = guild ? 'GuildResolvable' : 'UserResolvable';
      throw new DiscordjsTypeError(ErrorCodes.InvalidType, name, type);
    }

    const entitlement = await this.client.rest.post(Routes.entitlements(this.client.application.id), {
      body: {
        sku_id: skuId,
        owner_id: resolved,
        owner_type: guild ? EntitlementOwnerType.Guild : EntitlementOwnerType.User,
      },
    });
    return new Entitlement(this.client, entitlement);
  }

  /**
   * Deletes a test entitlement
   * @param {EntitlementResolvable} entitlement The entitlement to delete
   * @returns {Promise<void>}
   */
  async deleteTest(entitlement) {
    const resolved = this.resolveId(entitlement);
    if (!resolved) throw new DiscordjsTypeError(ErrorCodes.InvalidType, 'entitlement', 'EntitlementResolvable');

    await this.client.rest.delete(Routes.entitlement(this.client.application.id, resolved));
  }
}

exports.EntitlementManager = EntitlementManager;
