class Menu {
  constructor() {
    this.gameIcons_ = gameIcons;
    this.menuItems_ = this.setupMenuItems_();
    this.currentImageVariation_ = ct.images.image.black;
  }

  createMenu() {
    const appElement = document.getElementById('app');
    const menuElement = createAndAppendDivWithClass(appElement, 'menu');
    menuElement.onwheel = (e) => e.stopPropagation();
    menuElement.onmousemove = (e) => e.stopPropagation();
    menuElement.ontouchstart = (e) => e.stopPropagation();
    menuElement.ontouchmove = (e) => e.stopPropagation();
    menuElement.ontouchend = (e) => e.stopPropagation();

    const topElement = createAndAppendDivWithClass(menuElement, 'menu-top');
    const bottomElement =
        createAndAppendDivWithClass(menuElement, 'menu-bottom');
    this.createMenuItems_(topElement, bottomElement);
  }

  setToInitialSelection() {
    const selectedMenuItem =
        this.menuItems_.find(menuItem => menuItem.isSelected);
    if (selectedMenuItem) {
      this.selectMenuItem_(selectedMenuItem);
    }
  }

  descChanged() {
    document.querySelector('#mapTitle textarea').value =
        state.getProperty(pk.title);
    document.querySelector('#mapLongDesc textarea').value =
        state.getProperty(pk.longDescription);
    document.querySelector('#mapTheme select').selectedIndex =
        state.getProperty(pk.theme);
  }

  createMenuItems_(topElement, bottomElement) {
    this.menuItems_.forEach(menuItem => {
      this.createMenuItem_(menuItem, topElement, bottomElement);
    });
  }

  createMenuItem_(menuItem, topElement, bottomElement) {
    const submenuElement =
        createAndAppendDivWithClass(bottomElement, 'submenu');
    menuItem.submenu.element = submenuElement;
    this.createItem_(topElement, menuItem, () => {
      this.selectMenuItem_(menuItem);
    });
    this.populateMenuItem_(menuItem);
    const tipElement =
        createAndAppendDivWithClass(submenuElement, 'menu-tip');
    tipElement.textContent = menuItem.tip;
  }

  populateMenuItem_(menuItem) {
    menuItem.submenu.items.forEach(submenuItem => {
      // Wire it to its parent.
      submenuItem.parent = menuItem;
      this.createItem_(menuItem.submenu.element, submenuItem, () => {
        this.selectSubmenuItem_(submenuItem);
      });
    });
  }

  createItem_(parent, item, callback) {
    const element =
        createAndAppendDivWithClass(
            parent, 'menu-item ' + ((item.classNames || []).join(' ') || ''));
    element.title = item.name;
    if (item.id) element.id = item.id;
    element.onclick = callback;
    item.element = element;
    this.updateItem_(item);
  }

  updateItem_(item) {
    if (!item.enabledInReadonlyMode) {
      item.element.classList.add('disabled-in-read-only-mode');
    }
    let cells = null;
    switch (item.presentation) {
      case 'icon':
        const image = document.createElement('img');
        item.element.classList.add('menu-icon');
        image.src = `assets/ic_${item.materialIcon}_white_24px.svg`;
        item.element.appendChild(image);
        break;
      case 'label':
        item.element.classList.add('menu-label');
        if (item.text) {
          item.element.textContent = item.text;
        }
        break;
      case 'selected child':
        if (!item.submenu.allItems) {
          item.submenu.allItems = item.submenu.items;
        }
        let selectedChild = item.submenu.allItems.find(item => item.isSelected);
        cells = selectedChild.cells;
        item.element.className = 'menu-item';
        if (item.isSelected) item.element.classList.add('selected-menu-item');
        item.element.classList.add(...selectedChild.classNames);
        // Intentional fallthrough.
      case 'cells':
        item.element.innerHTML = '';
        this.createCellsForItem_(item.element, cells || item.cells);
        break;
      case 'input':
      case 'textarea':
        const label =
            createAndAppendDivWithClass(item.element, 'menu-textarea-label');
        label.textContent = item.name;
        const textarea = document.createElement(
            item.presentation == 'input' ? 'input' : 'textarea');
        if (item.presentation == 'textarea') {
          textarea.rows = item.rows;
        }
        textarea.className = 'menu-textarea-input';
        if (item.datalistId) {
          textarea.setAttribute('list', item.datalistId);
        }
        item.element.appendChild(textarea);
        item.oldText = '';
        if (item.onChange) {
          textarea.onchange = () => {
            item.onChange(item.oldText, textarea.value);
            item.oldText = textarea.value;
          }
        }
        if (item.onInput) {
          textarea.oninput = () => {
            item.onInput(item.oldText, textarea.value);
            item.oldText = textarea.value;
          }
        }
        break;
      case 'dropdown':
        const dropdownLabel =
            createAndAppendDivWithClass(item.element, 'menu-select-label');
        dropdownLabel.textContent = item.name;
        const select = document.createElement('select');
        item.element.appendChild(select);
        item.dropdownValues.forEach((dropdownValue, index) => {
          const option = document.createElement('option');
          option.textContent = dropdownValue;
          if (index == 0) option.selected = true;
          select.add(option);
        });
        if (item.onChange) {
          select.onchange = event => item.onChange(event.target.selectedIndex);
        }
        break;
    }
  }

  createCellsForItem_(parent, cells) {
    cells.forEach(cell => {
      const element =
          createAndAppendDivWithClass(parent, cell.classNames.join(' '));
      element.innerHTML = cell.innerHTML || '';
    });
  }

  selectMenuItem_(menuItem) {
    if (menuItem.element.classList.contains('disabled-menu-item')) {
      alert('This is a read-only view of this map; fork to edit.');
      return;
    }
    this.menuItems_.forEach(otherMenuItem => {
      const isThisItem = menuItem == otherMenuItem;
      otherMenuItem.isSelected = isThisItem;
      otherMenuItem.element
          .classList[isThisItem ? 'add' : 'remove']('selected-menu-item');
      otherMenuItem.submenu.element.style.display =
          isThisItem ? 'block' : 'none';
    });
    // Select the currently-selected tool in this submenu, if one exists.
    if (!menuItem.submenu.allItems) {
      menuItem.submenu.allItems = menuItem.submenu.items;
    }
    menuItem.submenu.allItems.forEach(submenuItem => {
      if (submenuItem.isSelected) {
        this.selectSubmenuItem_(submenuItem);
      }
    });
  }

  selectSubmenuItem_(submenuItem) {
    if (submenuItem.element.classList.contains('disabled-menu-item')) {
      alert('This is a read-only view of this map; fork to edit.');
      return;
    }
    if (!submenuItem.callback) {
      // This isn't an interactive item.
      return;
    }
    if (submenuItem.type == 'tool') {
      state.gesture = null;
      submenuItem.parent.submenu.allItems.forEach(otherSubmenuItem => {
        const isThisItem = submenuItem == otherSubmenuItem;
        otherSubmenuItem.isSelected = isThisItem;
        otherSubmenuItem.element
            .classList[isThisItem && otherSubmenuItem.type == 'tool' ?
                'add' : 'remove']('selected-submenu-item');
      });
      if (submenuItem.parent.presentation == 'selected child') {
        this.updateItem_(submenuItem.parent);
      }
      if (submenuItem.parent.parent &&
          submenuItem.parent.parent.presentation == 'selected child') {
        this.updateItem_(submenuItem.parent.parent);
      }
    }
    submenuItem.callback();
  }

  createWallTool_(size, isManual, isSelected) {
    const descriptionCells = [];
    if (size > 1 || isManual) {
      descriptionCells.push({
        innerHTML: size > 1 ? `${size}x${size}` : 'Man-<br/>ual',
        classNames: [
          'grid-cell',
          'primary-cell',
          'text-cell',
        ],
      });
    }
    return {
      name: `Wall/floor, ${size}x${size}`,
      type: 'tool',
      presentation: 'cells',
      classNames: ['menu-walls'],
      isSelected,
      callback: () => {
        state.gesture = new WallGesture(size, isManual);
      },
      cells: [
        {
          classNames: [
            'grid-cell',
            'primary-cell',
            'square-wall-cell',
          ],
        },
        {
          classNames: [
            'grid-cell',
            'primary-cell',
            'floor-cell',
          ],
        },
      ].concat(descriptionCells),
    };
  }

  createAngledWallToll_(kind, variation) {
    const kindClassNames = kind.id == ct.shapes.square.id ? [
      'square-cell-0',
      'square-cell-primary',
    ] : [
      'circle-cell-0',
      'circle-cell-primary',
    ];
    return {
      name,
      type: 'tool',
      presentation: 'cells',
      classNames: ['menu-walls-angled'],
      isSelected: false,
      callback: () => {
        state.gesture = new AngledWallGesture(ct.walls, kind, variation);
      },
      cells: [
        {
          classNames: [
            'grid-cell',
            'primary-cell',
            'floor-cell',
          ],
        },
        {
          classNames: [
            'grid-cell',
            'primary-cell',
            'angled-wall-cell-179',
          ],
        },
      ],
    };
  }

  createSeparatorTool_(name, kind, variation, requiredWall, isSelected) {
    const separatorClassNames = [];
    switch (kind.id) {
      case ct.separators.door.id:
        separatorClassNames.push('door-cell');
        break;
      case ct.separators.window.id:
        separatorClassNames.push('window-cell');
        separatorClassNames.push('window-cell-vertical');
        break;
      case ct.separators.bars.id:
        separatorClassNames.push('bars-cell-vertical');
        break;
      case ct.separators.fence.id:
        separatorClassNames.push('fence-cell-vertical');
        break;
      case ct.separators.curtain.id:
        separatorClassNames.push('curtain-cell-vertical');
        break;
    }
    switch (variation.id) {
      case ct.separators.door.double.id:
        separatorClassNames.push('double-door-cell-vertical');
        break;
      case ct.separators.door.secret.id:
        separatorClassNames.push('secret-door-cell');
        break;
    }
    return {
      name,
      type: 'tool',
      presentation: 'cells',
      classNames: ['menu-separators'],
      isSelected,
      callback: () => {
        state.gesture = new SeparatorGesture(kind, variation, requiredWall);
      },
      cells: [
        {
          classNames: [
            'grid-cell',
            'primary-cell',
            'floor-cell',
          ],
        },
        {
          classNames: [
            'grid-cell',
            'vertical-cell',
            requiredWall ? 'wall-cell' : 'floor-cell',
            requiredWall ? 'square-wall-cell' : '',
          ],
        },
        {
          innerHTML:
              variation.imagePath ? `<img src=${variation.imagePath} >` : '',
          classNames: [
            'vertical-cell',
            'separator-cell',
          ].concat(separatorClassNames),
        },
        {
          classNames: [
            'grid-cell',
            'primary-cell',
            'floor-cell',
          ],
        },
      ],
    };
  }

  createTextTool_() {
    return {
      name: 'Text',
      type: 'tool',
      presentation: 'cells',
      classNames: ['menu-text'],
      isSelected: true,
      callback: () => {
        state.gesture = new TextGesture();
      },
      cells: [
        {
          classNames: [
            'grid-cell',
            'primary-cell',
            'floor-cell',
          ],
        },
        {
          innerHTML: 'Text',
          classNames: [
            'grid-cell',
            'primary-cell',
            'text-cell',
          ],
        },
      ],
    };
  }

  createShapeTool_(name, kind, variation, isSelected) {
    const kindClassNames = kind.id == ct.shapes.square.id ? [
      'square-cell-0',
      'square-cell-primary',
    ] : [
      'circle-cell-0',
      'circle-cell-primary',
    ];
    return {
      name,
      type: 'tool',
      presentation: 'cells',
      classNames: ['menu-shapes'],
      isSelected,
      callback: () => {
        state.gesture =
          new ShapeGesture(ct.shapes, kind, variation);
      },
      cells: [
        {
          classNames: [
            'grid-cell',
            'primary-cell',
            'floor-cell',
          ],
        },
        {
          classNames: [
            'grid-cell',
            'primary-cell',
            'shape-cell',
          ].concat(kindClassNames).concat(variation.classNames),
        },
      ],
    };
  }

  createStairsTool_(name, kind, isSelected) {
    return {
      name,
      type: 'tool',
      presentation: 'cells',
      classNames: ['menu-stairs'],
      isSelected,
      callback: () => {
        state.gesture = new StaticBoxGesture(ct.stairs, kind, kind.generic);
      },
      cells: [
        {
          classNames: [
            'grid-cell',
            'primary-cell',
            'floor-cell',
          ],
        },
        {
          classNames: [
            'grid-cell',
            'primary-cell',
            'stairs-cell',
          ].concat(kind.generic.classNames),
        },
      ],
    };
  }

  showShareDialog_(mid, secret) {
    if (!mid) {
      alert('Cannot share empty map.');
      return;
    }
    const loc = window.location;
    const pageUrl =
        `${loc.protocol}//${loc.hostname}:${loc.port}${loc.pathname}`;
    let url = `${pageUrl}?mid=${encodeURIComponent(mid)}`;
    let message = 'URL to a read-only view of this map.';
    if (secret) {
      url = `${url}&secret=${encodeURIComponent(secret)}`;
      message = 'URL to a writable version of this map.';
    }
    window.prompt(message, url);
  }

  createTokenSelector_() {
    const selector = {
      name: 'Find by name',
      type: 'inputContainer',
      id: 'tokenSelector',
      classNames: ['menu-textarea', 'menu-input-container'],
      presentation: 'input',
      datalistId: 'gameIcons',
      rows: 1,
      enabledInReadonlyMode: false,
      submenu: {},
    };
    selector.onInput = (oldText, newText) => {
      this.updateTokenSelectorSubmenu_(selector, newText);
    };
    // Completions. Disable until a more intuitive solution is in place, for
    // example having both a category drop-down AND a free-text filter.
//    const completions = new Set();
//    this.gameIcons_.forEach(icon => {
//      // Disabling this for now, it leads to too many items:
//      //completions.add(icon.name);
//      icon.tags.forEach(tag => completions.add(tag));
//    });
//    const datalist = document.createElement('datalist');
//    datalist.id = selector.datalistId;
//    completions.forEach(completion => {
//      const option = document.createElement('option');
//      option.value = completion;
//      datalist.appendChild(option);
//    });
//    document.getElementById('app').appendChild(datalist);
    return selector;
  }

  createTokenButtons_() {
    return [
      this.createTokenButton_(
          this.gameIcons_.find(icon => icon.name == 'wyvern')),
    ];
  }

  createTokenButton_(gameIcon) {
    const path = gameIcon.path.replace('public/app/', '');
    return {
      name: gameIcon.name.replace('-', ' '),
      type: 'tool',
      presentation: 'cells',
      classNames: ['menu-tokens'],
      isSelected: gameIcon.name == 'wyvern',
      id: 'token_' + gameIcon.name,
      callback: () => {
        state.gesture = new ImageGesture(
            ct.images,
            ct.images.image,
            this.currentImageVariation_,
            path,
            false,
            gameIcon.hash);
      },
      cells: [
        {
          classNames: [
            'grid-cell',
            'primary-cell',
            'floor-cell',
          ],
        },
        {
          innerHTML: `<img src="${path}">`,
          classNames: [
            'grid-cell',
            'primary-cell',
            'image-cell',
          ],
        },
      ],
    };
  }

  createTokenColorSelector_(variation) {
    return {
      name: 'wyvern',
      type: 'tool',
      presentation: 'cells',
      classNames: ['menu-tokens'],
      callback: () => {
        this.currentImageVariation_ = variation;
        if (state.gesture instanceof ImageGesture) {
          state.gesture.setVariation(variation);
        }
      },
      cells: [
        {
          classNames: [
            'grid-cell',
            'primary-cell',
            'floor-cell',
          ],
        },
        {
          innerHTML:
              `<img src="assets/wyvern.svg" ` +
              `class="${(variation.classList || []).join(' ')}">`,
          classNames: [
            'grid-cell',
            'primary-cell',
            'image-cell',
          ],
        },
      ],
    };
  }

  updateTokenSelectorSubmenu_(selector, text) {
    if (!selector.submenu.element) {
      selector.submenu.element =
          createAndAppendDivWithClass(selector.parent.submenu.element, 'selector-submenu');
    }
    this.selectSubmenuItem_(selector.parent.submenu.items[1]);
    if (text.length < 2) {
      selector.submenu.element.style.display = 'none';
      return;
    }

    selector.submenu.element.innerHTML = '';
    let matchingIcons = text.length < 2 ? [] :
        this.gameIcons_.filter(gameIcon => this.iconNameMatch_(gameIcon, text));
    matchingIcons = matchingIcons.slice(0, 200);
    const buttons = matchingIcons.map(icon => this.createTokenButton_(icon));
    selector.submenu.items = buttons;
    selector.submenu.allItems =
        buttons.concat(selector.parent.submenu.items.slice(1));
    this.populateMenuItem_(selector);
    selector.parent.submenu.allItems = selector.submenu.allItems;
    selector.submenu.element.style.display = 'block';
  }

  iconNameMatch_(gameIcon, text) {
    return gameIcon.name.includes(text) ||
        gameIcon.tags.find(tag => tag.includes(text));
  }

  setupMenuItems_() {
    // Format is:
    // [
    //   {
    //     name: 'Menu item name',
    //     presentation: 'icon' | 'selected child',
    //     [id: 'element-id',]
    //     [materialIcon: 'icon_name',]
    //     [tip: 'Long text displayed in submenu',]
    //     [isSelected: true,]
    //     [classNames: ['classname1', 'classname2'],]
    //     [enabledInReadonlyMode: true,]
    //     submenu: {
    //       items: [
    //         {
    //           name: 'Submenu item name',
    //           type: 'label' | 'button' | 'tool',
    //           presentation: 'icon' | 'cells' | 'label',
    //           [id: 'element-id',]
    //           [materialIcon: 'icon_name',]
    //           [isSelected: true,]
    //           [classNames: ['classname1', 'classname2'],]
    //           [enabledInReadonlyMode: true,]
    //           [text: 'text',]
    //           [callback: () => {...},]
    //           [cells: [
    //             {
    //               classNames: ['classname1', 'classname2'],
    //               innerHTML: '...',
    //             },
    //           ],]
    //         },
    //       ],
    //     },
    //   },
    // ]
    return [
      {
        name: 'Status',
        presentation: 'icon',
        id: 'statusIcon',
        materialIcon: 'swap_vertical_circle',
        enabledInReadonlyMode: true,
        submenu: {
          items: [
            {
              name: 'Status',
              type: 'label',
              presentation: 'label',
              id: 'statusText',
              enabledInReadonlyMode: true,
            },
          ],
        },
      },
      {
        name: 'Info',
        presentation: 'icon',
        materialIcon: 'error_outline',
        enabledInReadonlyMode: true,
        submenu: {
          items: [
            {
              name: 'Title',
              type: 'inputContainer',
              id: 'mapTitle',
              classNames: ['menu-textarea', 'menu-input-container'],
              presentation: 'textarea',
              rows: 1,
              enabledInReadonlyMode: false,
              onChange: (oldText, newText) => {
                state.setProperty(pk.title, newText, true);
                state.opCenter.recordOperationComplete();
              }
            },
            {
              name: 'Description',
              type: 'inputContainer',
              id: 'mapLongDesc',
              classNames: ['menu-textarea', 'menu-input-container'],
              rows: 2,
              presentation: 'textarea',
              enabledInReadonlyMode: false,
              onChange: (oldText, newText) => {
                state.setProperty(pk.longDescription, newText, true);
                state.opCenter.recordOperationComplete();
              }
            },
            {
              name: 'Theme',
              type: 'inputContainer',
              presentation: 'dropdown',
              classNames: ['menu-input-container'],
              id: 'mapTheme',
              dropdownValues: themes.map(theme => theme.name),
              enabledInReadonlyMode: false,
              onChange: newChoiceNum => {
                state.setProperty(pk.theme, newChoiceNum, true);
                state.reloadTheme();
              },
            },
            {
              name: 'Created on',
              type: 'label',
              id: 'createdOn',
              presentation: 'label',
              enabledInReadonlyMode: true,
              text: 'Map not yet created',
            },
          ],
        },
      },
      {
        name: 'Select',
        presentation: 'icon',
        materialIcon: 'select_all',
        enabledInReadonlyMode: true,
        submenu: {
          items: [
            {
              name: 'Select Region',
              type: 'tool',
              presentation: 'icon',
              materialIcon: 'fullscreen',
              enabledInReadonlyMode: true,
              isSelected: true,
              callback: () => {
                state.gesture = new RegionSelectGesture();
              },
            },
            {
              name: 'Magic Wand Selection',
              type: 'tool',
              presentation: 'icon',
              materialIcon: 'flare',
              callback: () => {
                state.gesture = new MagicWandSelectGesture();
              },
            },
            {
              name: 'Invert Selection',
              type: 'button',
              presentation: 'icon',
              materialIcon: 'fullscreen_exit',
              enabledInReadonlyMode: true,
              callback: () => {
                if (state.gesture instanceof SelectGesture) {
                  state.gesture.invert();
                } else {
                  alert('Only valid when something is selected.');
                }
              },
            },
            {
              name: 'Cut',
              type: 'button',
              presentation: 'icon',
              materialIcon: 'content_cut',
              enabledInReadonlyMode: false,
              callback: () => {
                if (state.gesture instanceof SelectGesture) {
                  state.gesture.cut();
                } else {
                  alert('Only valid when something is selected.');
                }
              },
            },
            {
              name: 'Copy',
              type: 'button',
              presentation: 'icon',
              materialIcon: 'content_copy',
              enabledInReadonlyMode: true,
              callback: () => {
                if (state.gesture instanceof SelectGesture) {
                  state.gesture.copy();
                } else {
                  alert('Only valid when something is selected.');
                }
              },
            },
            {
              name: 'Paste',
              type: 'tool',
              presentation: 'icon',
              materialIcon: 'content_paste',
              enabledInReadonlyMode: false,
              callback: () => {
                state.gesture = new PasteGesture();
              },
            },
            {
              name: 'Delete Selection',
              type: 'button',
              presentation: 'icon',
              materialIcon: 'clear',
              enabledInReadonlyMode: false,
              callback: () => {
                if (state.gesture instanceof SelectGesture) {
                  state.gesture.deleteSelection();
                } else {
                  alert('Only valid when something is selected.');
                }
              },
            },
            /*
            {
              name: 'Rotate Left',
              type: 'button',
              presentation: 'icon',
              materialIcon: 'rotate_left',
              enabledInReadonlyMode: false,
              callback: () => {
                if (state.gesture instanceof PasteGesture) {
                  state.gesture.rotateLeft();
                } else {
                  alert('Only valid when the paste tool is active.');
                }
              },
            },
            {
              name: 'Rotate Right',
              type: 'button',
              presentation: 'icon',
              materialIcon: 'rotate_right',
              enabledInReadonlyMode: false,
              callback: () => {
                if (state.gesture instanceof PasteGesture) {
                  state.gesture.rotateRight();
                } else {
                  alert('Only valid when the paste tool is active.');
                }
              },
            },
            {
              name: 'Flip Horizontally',
              type: 'button',
              presentation: 'icon',
              materialIcon: 'flip',
              enabledInReadonlyMode: false,
              callback: () => {
                if (state.gesture instanceof PasteGesture) {
                  state.gesture.flipForizontally();
                } else {
                  alert('Only valid when the paste tool is active.');
                }
              },
            },
            {
              name: 'Flip Vertically',
              type: 'button',
              presentation: 'icon',
              materialIcon: 'flip',
              enabledInReadonlyMode: false,
              classNames: ['rotate-90'],
              callback: () => {
                if (state.gesture instanceof PasteGesture) {
                  state.gesture.flipVertically();
                } else {
                  alert('Only valid when the paste tool is active.');
                }
              },
            },
            */
          ],
        },
      },
      {
        name: 'Share',
        presentation: 'icon',
        materialIcon: 'share',
        enabledInReadonlyMode: true,
        submenu: {
          items: [
            {
              name: 'New',
              type: 'button',
              presentation: 'icon',
              materialIcon: 'create_new_folder',
              enabledInReadonlyMode: true,
              callback: () => {
                window.open('.', '_blank');
              },
            },
            {
              name: 'Read-only URL',
              type: 'button',
              presentation: 'icon',
              materialIcon: 'lock',
              enabledInReadonlyMode: true,
              callback: () => {
                this.showShareDialog_(state.getMid(), null);
              },
            },
            {
              name: 'Read-write URL',
              type: 'button',
              presentation: 'icon',
              materialIcon: 'lock_open',
              callback: () => {
                const secret = state.getSecret();
                if (!secret) {
                  alert('Cannot share a writable version of a read-only map.');
                  return;
                }
                this.showShareDialog_(state.getMid(), state.getSecret());
              },
            },
            {
              name: 'Fork',
              type: 'button',
              presentation: 'icon',
              materialIcon: 'call_split',
              enabledInReadonlyMode: true,
              callback: () => {
                state.opCenter.fork();
                alert('Forked!');
              },
            },
            {
              name: 'Download PNG',
              type: 'button',
              presentation: 'label',
              text: 'PNG',
              enabledInReadonlyMode: true,
              callback: () => {
                const overlay =
                    createAndAppendDivWithClass(document.body, 'modal-overlay');
                overlay.textContent = 'Constructing PNG...';
                setTimeout(() => {
                  const scale = 2.1875;
                  const numColumns = (state.getProperty(pk.lastColumn) -
                      state.getProperty(pk.firstColumn)) - 1;
                  const numRows = (state.getProperty(pk.lastRow) -
                      state.getProperty(pk.firstRow)) - 1;
                  const width = scale * (2 + numColumns *
                      (state.theMap.cellWidth + 1 +
                      state.theMap.dividerWidth + 1));
                  const height = scale * (2 + numRows *
                      (state.theMap.cellHeight + 1 +
                      state.theMap.dividerHeight + 1));
                  const theMapElement = document.getElementById('theMap');
                  domtoimage.toBlob(theMapElement, {
                    style: {
                      transform: `matrix(${scale}, 0, 0, ${scale}, 0, 0)`,
                    },
                    width,
                    height,
                  }).then(blob => {
                    saveAs(blob, 'mipui.png');
                    overlay.parentElement.removeChild(overlay);
                  }).catch(() => {
                    overlay.parentElement.removeChild(overlay);
                  });
                }, 10);
              },
            },
            {
              name: 'Download PNG of viewport',
              type: 'button',
              presentation: 'label',
              text: 'PNG (view)',
              enabledInReadonlyMode: true,
              callback: () => {
                const overlay =
                    createAndAppendDivWithClass(document.body, 'modal-overlay');
                overlay.textContent = 'Constructing PNG...';
                setTimeout(() => {
                  const appElement = document.getElementById('app');
                  const theMapElement = document.getElementById('theMap');
                  domtoimage.toBlob(theMapElement, {
                    width: appElement.clientWidth,
                    height: appElement.clientHeight,
                  }).then(blob => {
                    saveAs(blob, 'mipui.png');
                    overlay.parentElement.removeChild(overlay);
                  }).catch(() => {
                    overlay.parentElement.removeChild(overlay);
                  });
                }, 10);
              },
            },
            {
              name: 'Download SVG',
              type: 'button',
              presentation: 'label',
              text: 'SVG',
              enabledInReadonlyMode: true,
              callback: () => {
                const overlay =
                    createAndAppendDivWithClass(document.body, 'modal-overlay');
                overlay.textContent = 'Constructing SVG...';
                setTimeout(() => {
                  const numColumns = (state.getProperty(pk.lastColumn) -
                      state.getProperty(pk.firstColumn)) - 1;
                  const numRows = (state.getProperty(pk.lastRow) -
                      state.getProperty(pk.firstRow)) - 1;
                  const width = 2 + numColumns *
                      (state.theMap.cellWidth + 1 +
                      state.theMap.dividerWidth + 1);
                  const height = 2 + numRows *
                      (state.theMap.cellHeight + 1 +
                      state.theMap.dividerHeight + 1);
                  const theMapElement = document.getElementById('theMap');
                  domtoimage.toSvg(theMapElement, {
                    style: { transform: '' },
                    width,
                    height,
                  }).then(dataUrl => {
                    const blob = new Blob([dataUrl.substr(33)], {type: "image/svg+xml"});
                    saveAs(blob, 'mipui.svg');
                    overlay.parentElement.removeChild(overlay);
                  }).catch(() => {
                    overlay.parentElement.removeChild(overlay);
                  });
                }, 10);
              },
            },
            {
              name: 'Reset grid',
              type: 'button',
              presentation: 'icon',
              materialIcon: 'delete',
              callback: () => {
                resetGrid();
              },
            },
          ],
        },
      },
      {
        name: 'View',
        presentation: 'icon',
        materialIcon: 'search',
        enabledInReadonlyMode: true,
        tip: 'Pan with middle mouse button or touch pad, zoom with mousewheel or pinch.',
        submenu: {
          items: [
            {
              name: 'Reset view',
              type: 'button',
              presentation: 'icon',
              materialIcon: 'zoom_out_map',
              enabledInReadonlyMode: true,
              callback: () => {
                resetView();
              },
            },
            {
              name: 'Zoom In',
              type: 'button',
              presentation: 'icon',
              materialIcon: 'zoom_in',
              enabledInReadonlyMode: true,
              callback: () => {
                zoom({
                  x: 0,
                  y: 0,
                  deltaY: -1,
                });
              },
            },
            {
              name: 'Zoom Out',
              type: 'button',
              presentation: 'icon',
              materialIcon: 'zoom_out',
              enabledInReadonlyMode: true,
              callback: () => {
                zoom({
                  x: 0,
                  y: 0,
                  deltaY: 1,
                });
              },
            },
          ],
        },
      },
      {
        name: 'Walls',
        presentation: 'selected child',
        tip: 'Add a wall by clicking a divider cell between two floor cells.',
        isSelected: true,
        submenu: {
          items: [
            this.createWallTool_(1, false, true),
            this.createWallTool_(3, false, false),
            this.createWallTool_(5, false, false),
            this.createWallTool_(7, false, false),
            this.createWallTool_(9, false, false),
            this.createWallTool_(1, true, false),
            this.createAngledWallToll_(ct.walls.smooth, ct.walls.smooth.angled),
          ],
        },
      },
      {
        name: 'Separators',
        presentation: 'selected child',
        tip: 'Drag when placing to create a multi-cell separator.',
        classNames: ['menu-separators'],
        submenu: {
          items: [
            this.createSeparatorTool_('Single door', ct.separators.door,
                ct.separators.door.single, true, true),
            this.createSeparatorTool_('Double door', ct.separators.door,
                ct.separators.door.double, true, false),
            this.createSeparatorTool_('Secret door', ct.separators.door,
                ct.separators.door.secret, true, false),
            this.createSeparatorTool_('Window', ct.separators.window,
                ct.separators.window.generic, true, false),
            this.createSeparatorTool_('Bars', ct.separators.bars,
                ct.separators.bars.generic, false, false),
            this.createSeparatorTool_('Fence', ct.separators.fence,
                ct.separators.fence.generic, false, false),
            this.createSeparatorTool_('Curtain', ct.separators.curtain,
                ct.separators.curtain.generic, false, false),
          ],
        },
      },
      {
        name: 'Text',
        presentation: 'selected child',
        tip: 'Drag when placing to stretch across multiple cells.',
        submenu: {
          items: [
            this.createTextTool_(),
          ],
        },
      },
      {
        name: 'Tokens',
        presentation: 'selected child',
        tip: 'Drag when placing to stretch across multiple cells.',
        submenu: {
          items: [this.createTokenSelector_()]
              .concat(this.createTokenButtons_()),
        },
      },
      {
        name: 'Shapes',
        presentation: 'selected child',
        submenu: {
          items: [
            this.createShapeTool_('Green square', ct.shapes.square, ct.shapes.square.green, true),
            this.createShapeTool_('Green circle', ct.shapes.circle, ct.shapes.square.green, false),
            this.createShapeTool_('Brown square', ct.shapes.square, ct.shapes.square.brown, false),
            this.createShapeTool_('Brown circle', ct.shapes.circle, ct.shapes.square.brown, false),
            this.createShapeTool_('Blue square', ct.shapes.square, ct.shapes.square.blue, false),
            this.createShapeTool_('blue circle', ct.shapes.circle, ct.shapes.square.blue, false),
            this.createShapeTool_('Red square', ct.shapes.square, ct.shapes.square.red, false),
            this.createShapeTool_('Red circle', ct.shapes.circle, ct.shapes.square.red, false),
            this.createShapeTool_('White square', ct.shapes.square, ct.shapes.square.white, false),
            this.createShapeTool_('White circle', ct.shapes.circle, ct.shapes.square.white, false),
          ],
        },
      },
      {
        name: 'Stairs',
        presentation: 'selected child',
        tip: 'Drag when placing to stretch across multiple cells.',
        classNames: ['menu-stairs'],
        submenu: {
          items: [
            this.createStairsTool_('Horizontal stairs', ct.stairs.horizontal, true),
            this.createStairsTool_('Vertical stairs', ct.stairs.vertical, false),
            this.createStairsTool_('Spiral stairs', ct.stairs.spiral, false),
          ],
        },
      },
      {
        name: 'About',
        presentation: 'icon',
        materialIcon: 'help',
        tip: '',
        enabledInReadonlyMode: true,
        submenu: {
          items: [
            {
              name: 'About',
              type: 'button',
              presentation: 'label',
              text: 'About',
              enabledInReadonlyMode: true,
              callback: () => {
                window.open('../index.html', '_blank');
              },
            },
            {
              name: 'Feedback',
              type: 'button',
              presentation: 'label',
              text: 'Report bug or request feature',
              enabledInReadonlyMode: true,
              callback: () => {
                window.open('https://feedback.userreport.com/7e918812-4e93-4a8f-9541-9af34d0f4231/', '_blank');
              },
            },
            {
              name: 'Contact',
              type: 'button',
              presentation: 'label',
              text: 'Contact',
              enabledInReadonlyMode: true,
              callback: () => {
                window.open('mailto:contact@mipui.net', '_blank');
              },
            },
            {
              name: 'Source Code',
              type: 'button',
              presentation: 'label',
              text: 'Source Code',
              enabledInReadonlyMode: true,
              callback: () => {
                window.open('https://github.com/amishne/mipui', '_blank');
              },
            },
          ],
        },
      },
    ];
  }
}
