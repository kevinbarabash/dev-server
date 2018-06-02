import * as React from "react";
import * as ReactDOM from "react-dom";
import {StyleSheet, css} from "aphrodite";

import foobar from "./foobar";

const container = document.createElement("div");
document.body.appendChild(container);

const styles = StyleSheet.create({
    header: {
        background: "pink",
    },
});

ReactDOM.render(<div className={css(styles.header)}>
    <h1>{foobar}</h1>
</div>, container);
