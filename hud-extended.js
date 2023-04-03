/** 
 * HUD Overlay Extended
 * @description
 * The Overlay adds functionallity to the hud to display all targets that are currently of interest.
 *  - Targets that are not yet Rooted but you have the appropriate level
 *      - Color: themes `hp` color
 *      - Postfix: `R`
 *  - Targets that have open contracts
 *      - Color: themes `money` color
 *      - Postfix: `C` (One for each contract if they have multiple)
 *  - Targets that are rooted but don´t have a backdoor
 *      - Color: themes `hack` color
 *      - Postfix: `B`
 *  - Targets that belong to a faction are especially marked
 *      - Color: themes `cha` (charisma) color 
 *      - Postfix: `F`
 * 
 *  Player owned servers are expected to have `srv` in their name to filter them out.
 * 
 * @param {NS} ns  - Netscript Utils
 * 
 * @author Moonwolf287
 * @link https://github.com/Moonwolf287/Bitburner
 **/
export async function main(ns) {
    ns.disableLog("ALL");

    // --help flag
    const args = ns.flags([["help", false]]);
    if (args.help) {
        ns.tprint("HUD Overlay extended will expand your HUD ('Overview') with a list of interesting targets.");
        ns.tprint(`Usage: run ${ns.getScriptName()}  [height-constraint]`);
        ns.tprint(' - height-constraint: Sets the specified height constraint for the "Overview" window. Default: 60vh');
        ns.tprint("Examples:");
        ns.tprint(`> run ${ns.getScriptName()}`);
        ns.tprint(`> run ${ns.getScriptName()} 500px`);
        ns.tprint(`> run ${ns.getScriptName()} 50vh`);
        return;
    }

    // [heigh-constraint]
    let heightConstraint = ns.args[0];
    if (heightConstraint === undefined) {
        heightConstraint = '60vh'
    }

    const faction = ["CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z", "w0r1d_d43m0n"];
    const classUnrooted = 'HUDE-no-root'
    const classNoBackdoor = 'HUDE-no-backdoor'
    const classContract = 'HUDE-contract'
    const classFaction = 'HUDE-faction'
    const classLink = 'HUDE-link'

    const doc = eval('document');
    const removeByClassName = (sel) => doc.querySelectorAll(sel).forEach(el => el.remove());
    const colorByClassName = (sel, col) => doc.querySelectorAll(sel).forEach(el => el.style.color = col);

    const table = doc.getElementById('overview-hp-hook').closest('table');
    // Force a max height since the list can get too long for the screen quickly.
    table.style.maxHeight = heightConstraint;
    table.style.overflow = 'scroll';

    // Prepare row for elements to be displayed.
    const targetRow = doc.createElement('tr');
    targetRow.classList.add('MuiTableRow-root');
    targetRow.innerHTML = `<th class="MuiTableCell-root jss8 MuiTableCell-body MuiTableCell-sizeMedium css-hadb7u" scope="row" colspan="2">
			<hr>
			<p class="MuiTypography-root MuiTypography-body1 jss10 css-cxl1tz" style="text-align:center">
				<element class="HUDE_Target_H" title="Targets that you can hack, backdoor or have open contracts.">Targets</element>
			</p>
			<p id="target_hook" class="MuiTypography-root MuiTypography-body1 jss10 css-cxl1tz" style="text-align:left"></p>
		</th>`

    // Reset changes to hud on exit.
    ns.atExit(function () {
        removeByClassName('.HUDE_el');
        targetRow.remove();
        table.style = ''
    })

    // onClick Terminal command
    // example:
    // - home; connect n00dles;
    // with backdoor true:
    // - home; connect n00dles; backdoor
    let tcommand = (command, backdoor) => {
        if (backdoor) {
            command += '; backdoor'
        }

        let tIn = doc.getElementById("terminal-input"),
            tEv = tIn[Object.keys(tIn)[1]];
        tIn.value = command
        tEv.onChange({ target: tIn });
        tEv.onKeyDown({ keyCode: "13", preventDefault: () => 0 });
    }


    let theme;
    const TERMINAL_CMD = []
    while (true) {
        try {
            theme = ns.ui.getTheme()

            // Remove the old make space for the new
            targetRow.remove()
            table.getElementsByTagName('tbody')[0].insertAdjacentElement('beforeend', targetRow);
            colorByClassName(".HUDE_Target_H", theme['combat'])
            removeByClassName('.HUDE_el');


            let targetHook = doc.getElementById('target_hook');
            // Prepare List of host infos.
            let targetList = 'none'

            let infos = getHostInfoFiltered(ns)
            let first = true;
            for (const host in infos) {
                let info = infos[host];
                if (first) {
                    first = false;
                    targetList = ''
                } else {
                    targetList += '<br>'
                }

                //If the path for the terminal command is not yet present, add it to the list.
                if (TERMINAL_CMD[host] === undefined) {
                    let hops = findPath(ns, host)[0];
                    let cmd = 'home; connect ' + hops.toString().replaceAll(',', '; connect ');
                    TERMINAL_CMD[host] = cmd;
                }

                // Prepare classes for colors and postfixes
                let postfix = ''
                let classes = classLink;
                if (faction.includes(host)) {
                    classes += ' ' + classFaction
                    postfix += ' F'
                }
                if (!info.root) {
                    classes += ' ' + classUnrooted
                    postfix += ' R'
                } else if (!info.backdoor) {
                    classes += ' ' + classNoBackdoor
                    postfix += ' B'
                }
                if (info.contracts) {
                    classes += ' ' + classContract
                    for (let j = 0; j < info.contracts; j++) {
                        postfix += ' C'
                    }
                }
                targetList += ' - <a class="' + classes + '" style="cursor:pointer;text-decoration:underline">' + host + '</a>' + postfix;
            }

            targetHook.insertAdjacentHTML('beforeend', `<element class="HUDE_BckDr HUDE_el">${targetList}</element>`)
            colorByClassName(".HUDE_BckDr", theme['combat'])
            colorByClassName('.' + classNoBackdoor, theme['hack'])
            colorByClassName('.' + classContract, theme['money'])
            colorByClassName('.' + classFaction, theme['cha'])
            colorByClassName('.' + classUnrooted, theme['hp'])

            // Bind onClick functionallity to insert Terminal command
            doc.querySelectorAll('.' + classLink).forEach(el => {
                el.addEventListener('click', tcommand.bind(null, TERMINAL_CMD[el.innerHTML], el.classList.contains(classNoBackdoor)))
            })

        } catch (err) {
            ns.print("ERROR: Update Skipped: " + String(err));
        }

        await ns.sleep(1000)
    }
}

/** 
 * Returns the Info for a filtered list of hosts.
 *
 * @param {NS} ns  - Netscript Utils
 * 
 * @returns {Hostinfo[]} Hostinfo - The information about the host
 * 
 * @author Moonwolf287
 * @link https://github.com/Moonwolf287/Bitburner
 * 
 * @typedef {Object} Hostinfo
 * @property {String} hostname - The name of the host.
 * @property {Boolean} root - Has root access.
 * @property {Boolean} backdoor - Backdoor is installed.
 * @property {Number} contracts - Number of contracts on the server.
 */
function getHostInfoFiltered(ns) {
    let hosts = getAllHosts(ns);
    const hostInfo = {};
    for (let i = 0; i < hosts.length; i++) {
        let host = hosts[i];
        let info = {
            hostname: host,
            root: ns.hasRootAccess(host),
            backdoor: ns.getServer(host).backdoorInstalled,
            contracts: ns.ls(host, '.cct').length
        }
        if (!info.root || !info.backdoor || info.contracts > 0) {
            hostInfo[host] = info
        }
    }
    return hostInfo
}

/**
 * Finds all possible hosts.
 * 
 * Not sure where I found this. will try to write my own scan function later.
 * 
 * @author Unknown
 * 
 * @param {NS} ns  - Netscript Utils
 * @return {String[]}
 */
function getAllHosts(ns) {
    return getAllHostsRecurse(ns, 'home', []).filter(target => !target.includes('srv') && target != 'home' && target != 'darkweb' && ns.getServerRequiredHackingLevel(target) <= ns.getHackingLevel());
}

/** 
 * Finds all possible hosts recursively.
 * 
 * Not sure where I found this. will try to write my own scan function later.
 * 
 * @author Unknown
 * 
 * @param {NS} ns  - Netscript Utils
 * @param {String} host
 * @return {String[]}
 */
function getAllHostsRecurse(ns, host, hosts) {
    hosts.push(host)

    let founds = ns.scan(host).filter(target => !hosts.includes(target));
    for (let i = 0; i < founds.length; i++) {
        hosts = getAllHostsRecurse(ns, founds[i], hosts);
    }
    return hosts;
}
/** 
 * Finds the path to the given target.
 * 
 * @author u/Hellakittehs
 * @link https://www.reddit.com/r/Bitburner/comments/rm097d/find_server_path_script/
 * @param {NS} ns  - Netscript Utils
 * @param {String} target - Target host to find the path too
 * @param {String} serverName - Server to start scan from
 * @param {String[]} serverList - List of servers denoting the path so far.
 * @param {String[]} ignore - Array containing ignored servers
 * @param {Boolean} isFound - True if the path is found
 * 
 * @returns [serverList, isFound]
 */
function findPath(ns, target, serverName = 'home', serverList = [], ignore = [], isFound = false) {
    ignore.push(serverName);
    let scanResults = ns.scan(serverName);
    for (let server of scanResults) {
        if (ignore.includes(server)) {
            continue;
        }
        if (server === target) {
            serverList.push(server);
            return [serverList, true];
        }
        serverList.push(server);
        [serverList, isFound] = findPath(ns, target, server, serverList, ignore, isFound);
        if (isFound) {
            return [serverList, isFound];
        }
        serverList.pop();
    }
    return [serverList, false];
}