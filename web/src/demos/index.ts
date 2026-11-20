// SPDX-License-Identifier: MIT
// Copyright (C) 2026 Pooya Parsa <pooya@pi0.io>
// The launcher's demos, one file each, in the order the menu lists them.
// A new demo: a file here that default-exports a Demo (launcher.ts), added below.
import type { Demo } from "../launcher.ts";
import agyThreejs from "./agy-threejs.ts";
import github from "./github.ts";
import bun from "./bun.ts";
import claude from "./claude.ts";
import docker from "./docker.ts";
import doom from "./doom.ts";
import dos from "./dos.ts";
import fx from "./fx.ts";
import git from "./git.ts";
import glimmer from "./glimmer.ts";
import go from "./go.ts";
import htop from "./htop.ts";
import mc from "./mc.ts";
import nginx from "./nginx.ts";
import nitro from "./nitro.ts";
import node from "./node.ts";
import nvim from "./nvim.ts";
import postgres from "./postgres.ts";
import python from "./python.ts";
import radio from "./radio.ts";
import rust from "./rust.ts";
import speak from "./speak.ts";
import sqlite from "./sqlite.ts";
import sshfs from "./sshfs.ts";
import tmux from "./tmux.ts";
import ubuntu from "./ubuntu.ts";
import valkey from "./valkey.ts";

export const DEMOS: Demo[] = [agyThreejs, github, glimmer, tmux, htop, mc, nvim, git, ubuntu, docker, claude, fx, sshfs, nginx, node, bun, nitro, python, go, rust, postgres, sqlite, valkey, radio, speak, dos, doom];
