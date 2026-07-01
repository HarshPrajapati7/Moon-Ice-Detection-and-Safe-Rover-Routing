import React from "react";

/** Catches errors from children (e.g. a missing GLB) and renders a fallback. */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err) {
    // eslint-disable-next-line no-console
    console.warn("Asset failed to load, using fallback:", err?.message || err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
