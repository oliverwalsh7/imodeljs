/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Toolbar
 */

import * as classnames from "classnames";
import * as React from "react";
import { CommonProps, NoChildrenProps, flattenChildren } from "@bentley/ui-core";
import { Direction, DirectionHelpers, OrthogonalDirection, OrthogonalDirectionHelpers } from "../utilities/Direction";
import { Items } from "./Items";
import "./Toolbar.scss";

/** Available alignment modes of [[Toolbar]] panels.
 * @beta
 */
export enum ToolbarPanelAlignment {
  Start,
  End,
}

/** Helpers for [[ToolbarPanelAlignment]].
 * @alpha
 */
export class ToolbarPanelAlignmentHelpers {
  /** Class name of [[ToolbarPanelAlignment.Start]] */
  public static readonly START_CLASS_NAME = "nz-panel-alignment-start";
  /** Class name of [[ToolbarPanelAlignment.End]] */
  public static readonly END_CLASS_NAME = "nz-panel-alignment-end";

  /** @returns Class name of specified [[ToolbarPanelAlignment]] */
  public static getCssClassName(panelAlignment: ToolbarPanelAlignment): string {
    switch (panelAlignment) {
      case ToolbarPanelAlignment.Start:
        return ToolbarPanelAlignmentHelpers.START_CLASS_NAME;
      case ToolbarPanelAlignment.End:
        return ToolbarPanelAlignmentHelpers.END_CLASS_NAME;
    }
  }
}

/** Properties of [[PanelsProvider]] component.
 * @alpha
 */
export interface PanelsProviderProps {
  /** Render prop that provides item panels. */
  children?: (items: React.ReactNode) => React.ReactNode;
  /** Histories container. */
  histories: HTMLElement | null;
  /** Items of the toolbar. */
  items?: React.ReactNode;
  /** Panels container. */
  panels: HTMLElement | null;
}

/** Provides panels and histories of toolbar items.
 * @alpha
 */
export class PanelsProvider extends React.PureComponent<PanelsProviderProps> {
  private _update = false;
  private _refs = new Array<React.RefObject<ToolbarItem>>();

  private appendPanels() {
    const panels = this.props.panels;
    if (!panels)
      return;

    while (panels.firstChild) {
      panels.removeChild(panels.firstChild);
    }

    for (const ref of this._refs) {
      if (!ref.current)
        continue;
      panels.appendChild(ref.current.panel);
    }
  }

  private appendHistories() {
    const histories = this.props.histories;
    if (!histories)
      return;

    while (histories.firstChild) {
      histories.removeChild(histories.firstChild);
    }

    for (const ref of this._refs) {
      if (!ref.current)
        continue;
      histories.appendChild(ref.current.history); // tslint:disable-line: deprecation
    }
  }

  public componentDidMount() {
    this.appendPanels();
    this.appendHistories();
    this._update = true;
  }

  public componentDidUpdate() {
    this.appendPanels();
    this.appendHistories();
    this._update = true;
  }

  public render() {
    const flattened = flattenChildren(this.props.items);
    const itemsArray = React.Children.toArray(flattened);
    this._refs = [];
    this._update = false;

    const items = itemsArray.reduce<React.ReactNode[]>((acc, item) => {
      if (!React.isValidElement<ToolbarItemProps<ToolbarItem>>(item))
        return acc;

      const toolbarItemRef: React.MutableRefObject<ToolbarItem | null> = {
        current: null,
      };
      item = React.cloneElement(item, {
        toolbarItemRef: this._handleToolbarItemRef(toolbarItemRef),
      });
      this._refs.push(toolbarItemRef);

      const accElement = (acc as React.ReactNodeArray);
      accElement.push(item);
      return acc;
    }, []);
    return this.props.children && this.props.children(items);
  }

  private _handleToolbarItemRef = (toolbarItemRef: React.MutableRefObject<ToolbarItem | null>) => (toolbarItem: ToolbarItem | null) => {
    toolbarItemRef.current = toolbarItem;
    this._update && this.forceUpdate();
  }
}

/** Properties of [[Toolbar]] component.
 * @beta
 */
export interface ToolbarProps extends CommonProps, NoChildrenProps {
  /** Describes to which direction the history/panel items are expanded. Defaults to: [[Direction.Bottom]] */
  expandsTo?: Direction;
  /** Items of the toolbar. I.e. [[Item]], [[ExpandableItem]], [[Overflow]] */
  items?: React.ReactNode;
  /** Describes how expanded panels are aligned. Defaults to: [[ToolbarPanelAlignment.Start]] */
  panelAlignment?: ToolbarPanelAlignment;
}

/** @alpha */
export const getToolbarDirection = (expandsTo: Direction): OrthogonalDirection => {
  const orthogonalDirection = DirectionHelpers.getOrthogonalDirection(expandsTo);
  return OrthogonalDirectionHelpers.inverse(orthogonalDirection);
};

interface ToolbarState {
  histories: HTMLElement | null;
  panels: HTMLElement | null;
}

/** A toolbar that contains toolbar items.
 * @beta
 */
export class Toolbar extends React.PureComponent<ToolbarProps, ToolbarState> {
  public static readonly defaultProps = {
    expandsTo: Direction.Bottom,
    panelAlignment: ToolbarPanelAlignment.Start,
  };

  /** @internal */
  public readonly state = {
    histories: null,
    panels: null,
  };

  public render() {
    return (
      <ToolbarDirectionContext.Provider value={this.props.expandsTo!}>
        <PanelsProvider
          histories={this.state.histories}
          items={this.props.items}
          panels={this.state.panels}
        >
          {this._renderItems}
        </PanelsProvider>
      </ToolbarDirectionContext.Provider>
    );
  }

  private _renderItems = (items: React.ReactNode) => {
    const direction = getToolbarDirection(this.props.expandsTo!);
    const className = classnames(
      "nz-toolbar-toolbar",
      DirectionHelpers.getCssClassName(this.props.expandsTo!),
      OrthogonalDirectionHelpers.getCssClassName(direction),
      ToolbarPanelAlignmentHelpers.getCssClassName(this.props.panelAlignment!),
      this.props.className);

    return (
      <div
        className={className}
        style={this.props.style}
      >
        <div
          className="nz-expanded nz-histories"
          ref={this._handleHistoriesRef}
        />
        <div
          className="nz-expanded nz-panels"
          ref={this._handlePanelsRef}
        />
        <Items
          className="nz-items"
          direction={direction}
        >
          {items}
        </Items>
      </div >
    );
  }

  private _handleHistoriesRef = (histories: HTMLElement | null) => {
    this.setState({ histories });
  }

  private _handlePanelsRef = (panels: HTMLElement | null) => {
    this.setState({ panels });
  }
}

/** Defines toolbar item component.
 * @alpha
 */
export interface ToolbarItem {
  readonly panel: HTMLElement;
  /** @deprecated */
  readonly history: HTMLElement;
}

/** These props will be injected by Toolbar.
 * @note Must be passed down when wrapping the toolbar item component.
 * @alpha
 */
export interface ToolbarItemProps<TItem extends ToolbarItem = ToolbarItem> {
  readonly toolbarItemRef?: React.Ref<TItem>;
}

/** Extracts [[ToolbarItemProps]] from your props.
 * @alpha
 */
export const getToolbarItemProps = <TProps extends {}>(props: TProps): ToolbarItemProps<ToolbarItem> => {
  const toolbarItemProps = props as ToolbarItemProps<ToolbarItem>;
  if (toolbarItemProps.toolbarItemRef)
    return {
      toolbarItemRef: toolbarItemProps.toolbarItemRef,
    };
  return {};
};

/**
 * Context used by Toolbar component to provide Direction to child components.
 * @internal
 */
// tslint:disable-next-line: variable-name
export const ToolbarDirectionContext = React.createContext<Direction>(Direction.Bottom);
