/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Properties
 */

import * as React from "react";
import _ from "lodash";
import { Orientation } from "@bentley/ui-core";
import { PropertyValueFormat, ArrayValue, PropertyRecord } from "@bentley/imodeljs-frontend";
import { PropertyValueRendererManager, PropertyValueRendererContext, PropertyContainerType } from "../ValueRendererManager";
import { PrimitiveRendererProps, PrimitivePropertyRenderer } from "./PrimitivePropertyRenderer";
import { NonPrimitivePropertyRenderer } from "./NonPrimitivePropertyRenderer";
import { EditorContainer, PropertyUpdatedArgs } from "../../editors/EditorContainer";
import { UiComponents } from "../../UiComponents";
import { ActionButtonRenderer } from "./ActionButtonRenderer";

/** Properties shared by all renderers and PropertyView
 * @public
 */
export interface SharedRendererProps {
  /** PropertyRecord to render */
  propertyRecord: PropertyRecord;
  /** Unique string, that identifies this property component. Should be used if onClick or onRightClick are provided */
  uniqueKey?: string;
  /** Orientation to use for displaying the property */
  orientation: Orientation;
  /** Controls component selection */
  isSelected?: boolean;
  /** Called when property gets clicked. If undefined, clicking is disabled */
  onClick?: (property: PropertyRecord, key?: string) => void;
  /** Called when property gets right clicked. If undefined, right clicking is not working */
  onRightClick?: (property: PropertyRecord, key?: string) => void;
  /** Called to show a context menu for properties */
  onContextMenu?: (property: PropertyRecord, e: React.MouseEvent) => void;
  /** Ratio between label and value cells */
  columnRatio?: number;
  /** Callback to ratio change event */
  onColumnRatioChanged?: (ratio: number) => void;
  /** Indicates that properties have *hover* effect */
  isHoverable?: boolean;
  /** Indicates that properties can be selected */
  isSelectable?: boolean;
  /** Width of the whole property element */
  width?: number;
  /** Array of action button renderers @beta */
  actionButtonRenderers?: ActionButtonRenderer[];
}

/** Properties of [[PropertyRenderer]] React component
 * @public
 */
export interface PropertyRendererProps extends SharedRendererProps {
  /** Custom value renderer */
  propertyValueRendererManager?: PropertyValueRendererManager;
  /** Multiplier of how much the property is indented to the right */
  indentation?: number;
  /** Indicates property is being edited @beta */
  isEditing?: boolean;
  /** Called when property edit is committed. @beta */
  onEditCommit?: (args: PropertyUpdatedArgs) => void;
  /** Called when property edit is cancelled. @beta */
  onEditCancel?: () => void;
}

/** State of [[PropertyRenderer]] React component
 * @internal
 */
interface PropertyRendererState {
  /** Currently loaded property value */
  displayValue?: React.ReactNode;
}

/**  A React component that renders properties
 * @public
 */
export class PropertyRenderer extends React.Component<PropertyRendererProps, PropertyRendererState> {
  private _isMounted = false;

  /** @internal */
  public readonly state: Readonly<PropertyRendererState> = {
    displayValue: UiComponents.translate("general.loading"),
  };

  constructor(props: PropertyRendererProps) {
    super(props);
  }

  public static getLabelOffset(indentation?: number) {
    if (!indentation)
      return 0;

    return indentation * 17;
  }

  private async updateDisplayValue(props: PropertyRendererProps) {
    if (props.isEditing) {
      this.updateDisplayValueAsEditor(props);
      return;
    }

    const rendererContext: PropertyValueRendererContext = {
      orientation: this.props.orientation,
      containerType: PropertyContainerType.PropertyPane,
    };
    let displayValue: React.ReactNode | undefined;

    if (this.props.propertyValueRendererManager)
      displayValue = await this.props.propertyValueRendererManager.render(props.propertyRecord, rendererContext);
    else
      displayValue = await PropertyValueRendererManager.defaultManager.render(props.propertyRecord, rendererContext);

    // Align value with label if orientation is vertical
    if (this.props.orientation === Orientation.Vertical)
      displayValue = <span style={{ paddingLeft: PropertyRenderer.getLabelOffset(this.props.indentation) }}>{displayValue}</span>;

    // istanbul ignore next
    if (!this._isMounted)
      return;

    this.setState({ displayValue });
  }

  private _onEditCommit = (args: PropertyUpdatedArgs) => {
    if (this.props.onEditCommit)
      this.props.onEditCommit(args);
  }

  private _onEditCancel = () => {
    if (this.props.onEditCancel)
      this.props.onEditCancel();
  }

  /** Display property record value in an editor */
  public updateDisplayValueAsEditor(props: PropertyRendererProps) {
    // istanbul ignore next
    if (!this._isMounted)
      return;

    this.setState({
      displayValue:
        <EditorContainer
          propertyRecord={props.propertyRecord}
          onCommit={this._onEditCommit}
          onCancel={this._onEditCancel}
          setFocus={true}
        />,
    });
  }

  /** @internal */
  public componentDidMount() {
    this._isMounted = true;
    this.updateDisplayValue(this.props); // tslint:disable-line:no-floating-promises
  }

  /** @internal */
  public componentWillUnmount() {
    this._isMounted = false;
  }

  /** @internal */
  public componentDidUpdate(prevProps: PropertyRendererProps) {
    if (prevProps.propertyRecord !== this.props.propertyRecord
      || prevProps.isEditing !== this.props.isEditing)
      this.updateDisplayValue(this.props); // tslint:disable-line:no-floating-promises
  }

  /** @internal */
  public render() {
    const { children, propertyValueRendererManager, isEditing, onEditCommit, onEditCancel, ...props } = this.props;
    const primitiveRendererProps: PrimitiveRendererProps = {
      ...props,
      valueElement: this.state.displayValue,
      indentation: this.props.indentation,
    };

    switch (this.props.propertyRecord.value.valueFormat) {
      case PropertyValueFormat.Primitive:
        return (
          <PrimitivePropertyRenderer {...primitiveRendererProps} />
        );
      case PropertyValueFormat.Array:
        // If array is empty, render it as a primitive property
        if (this.props.propertyRecord.value.valueFormat === PropertyValueFormat.Array
          && (this.props.propertyRecord.value as ArrayValue).items.length === 0)
          return (
            <PrimitivePropertyRenderer {...primitiveRendererProps} />
          );
      // tslint:disable-next-line:no-switch-case-fall-through
      case PropertyValueFormat.Struct:
        return (
          <NonPrimitivePropertyRenderer
            isCollapsible={true}
            {...primitiveRendererProps}
          />
        );
    }
  }
}
