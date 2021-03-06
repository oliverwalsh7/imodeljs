/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Views
 */
import { Id64, Id64Arg, Id64String } from "@bentley/bentleyjs-core";
import { ElementState } from "./EntityState";
import { IModelConnection } from "./IModelConnection";
import { CategorySelectorProps } from "@bentley/imodeljs-common";

/** A set of Categories to be displayed in a [[ViewState]].
 * Elements belonging to categories not specified in the category selector will not be drawn in the view.
 * By default, geometry belonging to any [[SubCategory]] of a visible Category is also visible in the view,
 * unless the [[SubCategoryAppearance]] or [[SubCategoryOverride]] specifies that it should be invisible.
 * @note To change the set of categories visible in a [[ViewState]] currently associated with a [[Viewport]],
 * use [[ViewState.changeCategoryDisplay]] to ensure the view updates appropriately on screen.
 * @see [[Category]]
 * @public
 */
export class CategorySelectorState extends ElementState {
  /** @internal */
  public static get className() { return "CategorySelector"; }
  public categories: Set<string> = new Set<string>();
  constructor(props: CategorySelectorProps, iModel: IModelConnection) {
    super(props, iModel);
    if (props.categories)
      props.categories.forEach((cat) => this.categories.add(cat));
  }

  public toJSON(): CategorySelectorProps {
    const val = super.toJSON() as CategorySelectorProps;
    val.categories = [];
    this.categories.forEach((cat) => val.categories.push(cat));
    return val;
  }

  /** Returns true if this category selector is logically equivalent to the specified category selector.
   * Two category selectors are logically equivalent if they have the same name and Id and contain the same set of category Ids.
   */
  public equalState(other: CategorySelectorState): boolean {
    if (this.categories.size !== other.categories.size || this.name !== other.name || this.id !== other.id)
      return false;

    const otherIter = other.categories.keys();
    let otherRes = otherIter.next();
    for (let thisIter = this.categories.keys(), thisRes = thisIter.next(); !thisRes.done; thisRes = thisIter.next(), otherRes = otherIter.next()) {
      if (thisRes.value !== otherRes.value)
        return false;
    }

    return true;
  }

  /** The name of this CategorySelector */
  public get name(): string { return this.code.getValue(); }

  /** Determine whether this CategorySelector includes the specified categoryId string */
  public has(id: Id64String): boolean { return this.categories.has(id.toString()); }

  /** Determine whether this CategorySelector includes the specified category */
  public isCategoryViewed(categoryId: Id64String): boolean { return this.has(categoryId); }

  /** Add one or more categories to this CategorySelector */
  public addCategories(arg: Id64Arg): void {
    Id64.forEach(arg, (id) => this.categories.add(id));
  }

  /** Remove one or more categories from this CategorySelector */
  public dropCategories(arg: Id64Arg) {
    Id64.forEach(arg, (id) => this.categories.delete(id));
  }

  /** Add or remove categories from this CategorySelector.
   * @param arg The categories to add or remove
   * @param add If true, categories will be added; otherwise they will be removed.
   */
  public changeCategoryDisplay(arg: Id64Arg, add: boolean): void { if (add) this.addCategories(arg); else this.dropCategories(arg); }
}
